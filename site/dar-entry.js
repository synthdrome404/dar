/* ДАР — вход через двери (вариант A, главная).
   Прогресс входа задаёт только прокрутка (колесо, тачпад, касание, клавиатура) — никаких таймеров.
   Сцена: закрытая дверь → створки открываются → камера проходит в проём → фото класса на весь экран →
   фото «садится» в арку героя, а рамка арки — тот же портал из 3D-модели (assets/portal-frame.webp).
   3D (three.js + glb) подгружается лениво из dar-door3d.js; без WebGL или при «уменьшить движение» —
   статичный постер и мягкая смена кадра. */
(function () {
  'use strict';
  var root = document.documentElement;
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var HANDOFF = 0.62, SETTLE = [0.62, 0.95], PHOTO_FOCUS = [0.5, 0.5], PHOTO_AR = 1440 / 831;

  function clamp(v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a || 0, v)); }
  function seg(a, b, v) { return clamp((v - a) / (b - a)); }
  function smooth(a, b, v) { v = seg(a, b, v); return v * v * (3 - 2 * v); }
  function easeInOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function mode() { return root.classList.contains('entry-on') ? 'on' : root.classList.contains('entry-fade') ? 'fade' : 'off'; }

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  function init() {
    var entry = document.querySelector('[data-entry]');
    if (!entry) return;
    var replay = entry.querySelector('[data-replay]');
    if (replay) replay.addEventListener('click', function (e) {
      e.preventDefault();
      try { history.replaceState(null, '', location.pathname + '#intro'); } catch (er) { /* ignore */ }
      try { history.scrollRestoration = 'manual'; } catch (er) { /* ignore */ }
      location.reload();
    });
    if (mode() === 'off') return;
    if (mode() === 'on' && !hasWebGL()) { root.classList.remove('entry-on'); root.classList.add('entry-fade'); }
    if (location.hash === '#intro') {
      try { history.scrollRestoration = 'manual'; history.replaceState(null, '', location.pathname); } catch (er) { /* ignore */ }
      window.scrollTo(0, 0);
    }

    var stage = entry.querySelector('[data-stage]'), scene = entry.querySelector('[data-scene]');
    var canvas = entry.querySelector('[data-canvas]'), poster = entry.querySelector('[data-poster]');
    var veil = entry.querySelector('[data-veil]'), run = entry.querySelector('[data-run]');
    var copy = entry.querySelector('[data-intro-copy]'), hint = entry.querySelector('[data-hint]'), skip = entry.querySelector('[data-skip]');
    var hero = entry.querySelector('[data-hero]'), heroCopy = entry.querySelector('[data-hero-copy]');
    var rig = entry.querySelector('[data-rig]'), win = entry.querySelector('[data-window]'), photo = entry.querySelector('[data-photo]');
    var frameImg = entry.querySelector('.arch-frame');
    var topbar = document.querySelector('.topbar'), header = document.querySelector('.site-header');

    var door = null, doorReady = false, loading = false;
    var target = 0, current = 0, raf = 0, last = 0, applied = -1, coarse = false;
    var M = {};                       // measurements (CSS px, relative to the stage)
    var slow = 0, frames = 0;

    try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) { /* ignore */ }

    function headerH() { return header ? header.getBoundingClientRect().height : 0; }

    function plateRect(vw, vh, zoom) {
      var c = Math.max(vw / PHOTO_AR, vh) * zoom, w = c * PHOTO_AR, h = c;
      var x = clamp(vw / 2 - PHOTO_FOCUS[0] * w, vw - w, 0), y = clamp(vh / 2 - PHOTO_FOCUS[1] * h, vh - h, 0);
      return { x: x, y: y, w: w, h: h };
    }
    function plateZoom(t) { return 1 + 0.07 * smooth(0.12, HANDOFF, t); }

    function measure() {
      root.style.setProperty('--topbar-h', (topbar && topbar.offsetParent !== null ? topbar.offsetHeight : 0) + 'px');
      M.vw = scene.clientWidth; M.vh = scene.clientHeight;
      M.view = Math.max(1, window.innerHeight - headerH());        // visible part of the stage while it is pinned
      M.run = Math.max(1, run.offsetHeight);
      // final layout of the arch, without the transforms of the transition
      var rt = rig.style.transform, pt = photo.style.transform;
      rig.style.transform = 'none'; photo.style.transform = 'none';
      var s = stage.getBoundingClientRect(), r = rig.getBoundingClientRect(), w = win.getBoundingClientRect(), p = photo.getBoundingClientRect();
      rig.style.transform = rt; photo.style.transform = pt;
      M.R1 = { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
      M.C1 = { x: w.left - s.left, y: w.top - s.top, w: w.width, h: w.height };
      M.win = { x: w.left - r.left, y: w.top - r.top };
      M.img = { x: p.left - w.left, y: p.top - w.top, w: p.width };
      // the arch opening at the hand-off: an arch so large that it covers the whole visible stage
      var W0 = Math.max(M.vw, M.view) * 1.06 + 40, m = W0 * 0.03;
      M.C0 = { x: (M.vw - W0) / 2, y: -(W0 / 2) - m, w: W0, h: W0 * M.C1.h / Math.max(1, M.C1.w) };
      // portrait screens: the door stands in the band between the copy and the scroll hint
      var portrait = false;
      try { portrait = matchMedia('(max-width: 700px), (max-aspect-ratio: 11/10)').matches; } catch (e) { /* ignore */ }
      var ct = copy.style.transform; copy.style.transform = 'none';
      var cb = copy.getBoundingClientRect().bottom, hb = hint.getBoundingClientRect().top, st = scene.getBoundingClientRect().top;
      copy.style.transform = ct;
      M.frame = { portrait: portrait, top: (cb - st + 22) / M.vh, bottom: (hb - st - 6) / M.vh };
      if (door) door.setSize(M.vw, M.vh, pixelRatio(), M.frame);
      applied = -1;
    }

    function pixelRatio() {
      var dpr = window.devicePixelRatio || 1, cap = coarse || M.vw < 700 ? 1.5 : 1.75;
      return Math.max(1, Math.min(dpr, cap) - slow * 0.25);
    }

    function readProgress() {
      var top = entry.getBoundingClientRect().top;
      return clamp((headerH() - top) / M.run);
    }

    /* ---------- one frame of the choreography ---------- */
    function cover(A, zoom) {
      var c = Math.max(A.w / PHOTO_AR, A.h) * zoom, w = c * PHOTO_AR;
      return { x: A.x + (A.w - w) / 2, y: A.y + (A.h - c) / 2, w: w, h: c };
    }
    function setRig(u) {
      if (u >= 1) { rig.style.transform = ''; photo.style.transform = ''; return; }
      var e = easeInOutSine(u), C1 = M.C1, C0 = M.C0;
      var w = C0.w * Math.pow(C1.w / C0.w, e);                  // even, camera-like zoom
      var k = (w - C0.w) / (C1.w - C0.w);
      var s = w / C1.w;
      var cx = lerp(C0.x, C1.x, k), cy = lerp(C0.y, C1.y, k), ch = C1.h * s;
      var tx = cx - M.R1.x - M.win.x * s, ty = cy - M.R1.y - M.win.y * s;
      rig.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) scale(' + s.toFixed(5) + ')';
      // the photo always covers the visible part of the opening; at u = 0 this is exactly the canvas plate,
      // at u = 1 exactly the CSS crop of the arch
      var x0 = Math.max(cx, 0), y0 = Math.max(cy, 0), x1 = Math.min(cx + w, M.vw), y1 = Math.min(cy + ch, M.vh);
      var I = cover({ x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }, lerp(plateZoom(HANDOFF), 1, e));
      var ax = (I.x - cx) / s - M.img.x, ay = (I.y - cy) / s - M.img.y, q = I.w / (M.img.w * s);
      photo.style.transform = 'translate3d(' + ax.toFixed(2) + 'px,' + ay.toFixed(2) + 'px,0) scale(' + q.toFixed(5) + ')';
    }

    function apply(t) {
      if (t === applied) return;
      applied = t;
      var three = mode() === 'on' && doorReady;
      // closed-door copy: drifts up and dissolves with the first steps
      var a = 1 - smooth(0.0, 0.17, t);
      copy.style.opacity = a.toFixed(3);
      copy.style.transform = 'translate3d(0,' + (-34 * smooth(0, 0.22, t)).toFixed(2) + 'px,0)';
      copy.style.visibility = a < 0.01 ? 'hidden' : '';
      var h = 1 - smooth(0.0, 0.05, t);
      hint.style.opacity = h.toFixed(3);
      hint.style.visibility = h < 0.01 ? 'hidden' : '';
      var sk = 1 - smooth(0.24, 0.38, t);
      skip.style.opacity = sk.toFixed(3);
      skip.style.visibility = sk < 0.01 ? 'hidden' : '';
      root.classList.toggle('entry-active', t < 0.9);

      if (three) {
        var before = t < HANDOFF;
        scene.style.visibility = before ? '' : 'hidden';
        scene.style.opacity = '';
        if (veil) veil.style.opacity = (1 - smooth(0.36, 0.52, t)).toFixed(3);
        if (before) door.render(t, plateRect(M.vw, M.vh, plateZoom(t)));
        var u = seg(SETTLE[0], SETTLE[1], t);
        hero.style.visibility = before ? 'hidden' : '';
        var ho = smooth(0.5, 0.96, u);
        heroCopy.style.opacity = ho.toFixed(3);
        heroCopy.style.transform = ho >= 1 ? '' : 'translate3d(0,' + ((1 - ho) * 26).toFixed(2) + 'px,0)';
        if (!before) setRig(u);
      } else {
        // fallback: poster, then a calm cross-fade into the hero (no motion)
        var po = 1 - smooth(0.28, 0.62, t);
        scene.style.opacity = po.toFixed(3);
        scene.style.visibility = po < 0.01 ? 'hidden' : '';
        hero.style.visibility = '';
        var f = smooth(0.42, 0.88, t);
        heroCopy.style.opacity = f.toFixed(3);
        heroCopy.style.transform = '';
        rig.style.transform = ''; photo.style.transform = '';
        rig.style.opacity = f.toFixed(3);
      }
      if (three) rig.style.opacity = '';
    }

    /* ---------- scroll → eased progress ---------- */
    function frame(now) {
      raf = 0;
      var dt = last ? Math.min(64, now - last) : 16;
      last = now;
      var tau = coarse ? 90 : 150;                                // ms; time constant of the glide
      current += (target - current) * (1 - Math.exp(-dt / tau));
      if (Math.abs(target - current) < 0.0004) current = target;
      apply(current);
      if (current !== target) {
        if (doorReady && mode() === 'on' && current < HANDOFF) watchSpeed(dt);
        raf = requestAnimationFrame(frame);
      } else last = 0;
    }
    function request() { if (!raf) raf = requestAnimationFrame(frame); }
    function onScroll() { target = readProgress(); request(); }
    function watchSpeed(dt) {
      // keep it smooth on weak GPUs: lower the pixel ratio if frames are consistently slow
      frames++;
      if (dt > 30) slow += 0.08;
      if (frames > 40 && slow > 2 && pixelRatio() > 1) { slow = Math.min(4, Math.round(slow / 2)); frames = 0; door.setSize(M.vw, M.vh, pixelRatio(), M.frame); }
      if (frames > 40) { frames = 0; slow = Math.max(0, slow - 1); }
    }

    function snapTo(t) { current = target = t; applied = -1; apply(t); }
    function toEnd() {
      var y = entry.getBoundingClientRect().top + window.pageYOffset - headerH() + M.run;
      window.scrollTo({ top: Math.ceil(y) + 1, behavior: 'instant' });
      snapTo(1);
    }

    skip.addEventListener('click', function (e) { e.preventDefault(); toEnd(); try { hero.querySelector('h1').focus({ preventScroll: true }); } catch (er) { /* ignore */ } });
    hero.addEventListener('focusin', function () { if (current < 1) toEnd(); });

    // the arch photo and frame sit hidden until the hand-off: decode them in advance so they never pop in late
    function predecode() {
      return Promise.all([photo, frameImg].map(function (im) {
        return im && im.decode ? im.decode().catch(function () {}) : null;
      }));
    }

    /* ---------- lazy 3D ---------- */
    function load3D() {
      if (loading || mode() !== 'on' || !SRC) return;
      loading = true;
      var base = SRC;
      import(new URL('dar-door3d.js', base).href).then(function (mod) {
        return mod.createDoor({
          canvas: canvas,
          glbUrl: new URL('assets/3d/dar-entrance.glb.json', base).href,
          photoUrl: photo.currentSrc || photo.src,
          mobile: M.vw < 700
        });
      }).then(function (d) {
        door = d;
        door.setSize(M.vw, M.vh, pixelRatio(), M.frame);
        return predecode();
      }).then(function () {
        doorReady = true;
        scene.style.opacity = '';
        applied = -1;
        apply(current);
        scene.classList.add('is-3d');
        stage.setAttribute('data-engine', 'webgl');
      }).catch(function () {
        door = null; doorReady = false;
        root.classList.remove('entry-on'); root.classList.add('entry-fade');
        stage.setAttribute('data-engine', 'fallback');
        measure(); onScroll(); snapTo(readProgress());
      });
    }

    measure();
    snapTo(readProgress());
    window.addEventListener('scroll', onScroll, { passive: true });
    var rto = 0;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(rto);
      rto = requestAnimationFrame(function () { measure(); onScroll(); snapTo(target); });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); applied = -1; apply(current); });
    function afterLoad() {
      measure(); applied = -1; apply(current);
      predecode();
      if (mode() !== 'on') return;
      if ('requestIdleCallback' in window) requestIdleCallback(load3D, { timeout: 900 });
      else setTimeout(load3D, 300);
    }
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad);
    window.addEventListener('pagehide', function () { if (door) door.dispose(); });
    // test / screenshot hook (no side effects)
    window.__darEntry = {
      get progress() { return current; }, get target() { return target; }, get ready() { return doorReady; },
      get settled() { return current === target; }, mode: mode, toEnd: toEnd,
      scrollFor: function (t) { return entry.getBoundingClientRect().top + window.pageYOffset - headerH() + t * M.run; }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
