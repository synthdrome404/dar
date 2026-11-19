// Variant images live in assets/ next to this script's folder; resolve relative to the script so the site works under any subpath.
const DAR_ASSETS=new URL('../assets/',document.currentScript.src);
document.addEventListener('DOMContentLoaded',()=>{
  const instances=new Map();
  document.querySelectorAll('[data-comparison]').forEach(figure=>{
    const stage=figure.querySelector('.compare-stage');
    const range=figure.querySelector('input[type="range"]');
    const grip=figure.querySelector('.compare-grip');
    const set=value=>{
      const v=Math.max(0,Math.min(100,Number(value)));
      stage.style.setProperty('--split',v+'%');range.value=String(v);
      range.setAttribute('aria-valuetext',`Исходное фото ${Math.round(v)}%, проект ${Math.round(100-v)}%`);
    };
    range.addEventListener('input',()=>set(range.value));
    let dragging=false;
    const position=e=>{const r=stage.getBoundingClientRect();set((e.clientX-r.left)/r.width*100)};
    grip.addEventListener('pointerdown',e=>{dragging=true;grip.setPointerCapture(e.pointerId);position(e);e.preventDefault()});
    grip.addEventListener('pointermove',e=>{if(dragging)position(e)});
    const stop=()=>{dragging=false};
    grip.addEventListener('pointerup',stop);grip.addEventListener('pointercancel',stop);grip.addEventListener('lostpointercapture',stop);
    set(range.value);instances.set(figure.id,{figure,set});
  });

  // Keep the original photograph fixed while replacing only the selected project.
  async function show(figure,src,caption){
    const after=figure.querySelector('[data-after]');
    const token=String(Number(figure.dataset.revision||0)+1);figure.dataset.revision=token;
    figure.setAttribute('aria-busy','true');
    try{
      const image=new Image();image.src=new URL(src,DAR_ASSETS).href;await image.decode();
      if(figure.dataset.revision!==token)return;
      after.src=image.src;
      figure.querySelector('[data-compare-caption]').textContent=caption;
      figure.querySelector('[data-open-after]').href=image.src;
    }finally{if(figure.dataset.revision===token)figure.setAttribute('aria-busy','false')}
  }
  const dining=document.querySelector('[data-dining-options]');
  if(dining){
    const variants=JSON.parse(dining.querySelector('[data-variants]').textContent);
    const params=new URLSearchParams(location.search);
    let cloth=['wine','linen'].includes(params.get('cloth'))?params.get('cloth'):'wine';
    let wall=['green','beige'].includes(params.get('wall'))?params.get('wall'):'green';
    let serving=params.get('serving')==='green'?'green':'light';
    const palettes=dining.querySelector('[data-light-palettes]');
    const figure=document.querySelector('#dining-compare');
    const update=()=>{
      dining.querySelectorAll('[data-serving]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.serving===serving)));
      dining.querySelectorAll('[data-cloth]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cloth===cloth)));
      dining.querySelectorAll('[data-wall]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wall===wall)));
      palettes.hidden=serving==='green';
      const variant=variants[serving==='green'?'green-service':cloth+'-'+wall];
      show(figure,variant.asset,variant.caption).catch(()=>{figure.querySelector('[data-compare-caption]').textContent='Вариант временно не загрузился. Попробуйте выбрать его ещё раз.'});
      const u=new URL(location.href);
      u.searchParams.set('serving',serving);
      u.searchParams.set('cloth',cloth);
      u.searchParams.set('wall',wall);
      history.replaceState(null,'',u);
    };
    dining.querySelectorAll('[data-serving]').forEach(b=>b.addEventListener('click',()=>{serving=b.dataset.serving;update()}));
    dining.querySelectorAll('[data-cloth]').forEach(b=>b.addEventListener('click',()=>{cloth=b.dataset.cloth;update()}));
    dining.querySelectorAll('[data-wall]').forEach(b=>b.addEventListener('click',()=>{wall=b.dataset.wall;update()}));
    if(serving==='green'||cloth!=='wine'||wall!=='green')update();
  }
  for(const kind of ['hall','wash']){
    const options=document.querySelector(`[data-${kind}-options]`);
    if(!options)continue;
    const variants=JSON.parse(options.querySelector('[data-variants]').textContent);
    const figure=document.querySelector(`#${kind}-compare`);
    const update=key=>{
      options.querySelectorAll(`[data-${kind}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[kind]===key)));
      const v=variants[key];
      show(figure,v.asset,v.caption).catch(()=>{figure.querySelector('[data-compare-caption]').textContent='Вариант временно не загрузился. Попробуйте выбрать его ещё раз.'});
      const u=new URL(location.href);u.searchParams.set(kind,key);history.replaceState(null,'',u);
    };
    options.querySelectorAll(`[data-${kind}]`).forEach(b=>b.addEventListener('click',()=>update(b.dataset[kind])));
    const selected=new URLSearchParams(location.search).get(kind);
    if(selected&&variants[selected])update(selected);
  }
});
