// Old links of the form spaces/#section lead to the dedicated page (paths relative to spaces/).
const legacySpaceLinks = {
  dining: 'dining/#dining',
  service: 'dining/#service',
  hall: 'hall/#hall',
  'hall-island': 'hall/#hall-island',
  'hall-reverse-compare': 'hall/#hall-reverse-compare',
  displays: 'hall/#displays',
  vent: 'ventilation/#vent',
  plants: 'plants/#plants',
  wash: 'handwash/#wash',
  paintings: '../art/#paintings',
  budget: 'budget/#budget'
};

if (/\/spaces\/(index\.html)?$/.test(location.pathname) && location.hash.length > 1) {
  const legacy = legacySpaceLinks[location.hash.slice(1)];
  if (legacy) {
    const target = new URL(legacy, location.href);
    target.search = location.search;
    location.replace(target);
  }
}

const gallery = document.querySelector('#project-gallery');
if (gallery && typeof gallery.showModal === 'function') {
  const image = gallery.querySelector('.gallery-image');
  const title = gallery.querySelector('#gallery-title');
  const close = gallery.querySelector('[data-gallery-close]');
  let opener;
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-enlarge]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    title.textContent = link.dataset.enlarge;
    image.toggleAttribute('data-protect', link.hasAttribute('data-protect'));
    image.draggable = !link.hasAttribute('data-protect');
    image.alt = link.dataset.enlarge;
    image.src = link.href;
    gallery.showModal();
  });
  close.addEventListener('click', () => gallery.close());
  gallery.addEventListener('click', event => {
    if (event.target === gallery) gallery.close();
  });
  gallery.addEventListener('close', () => {
    image.removeAttribute('src');
    opener?.focus({preventScroll: true});
  });
}

// Preview images of the paintings: no context menu and no dragging (cosmetic; the files are low-resolution sketches).
['contextmenu', 'dragstart'].forEach(type => document.addEventListener(type, event => {
  if (event.target instanceof Element && event.target.closest('[data-protect]')) event.preventDefault();
}));
