// UTILITÁRIOS

// escapa texto antes de concatenar no HTML (apóstrofos, aspas, <, &)
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// insere uma transformação do Cloudinary na URL (ex.: 'f_auto,q_auto,w_800')
function cloudinary(url, transform) {
  if (url.indexOf('/image/upload/') === -1) return url;
  return url.replace('/image/upload/', '/image/upload/' + transform + '/');
}

const FULL_TRANSFORM = 'f_auto,q_auto,w_2000';

function pad(n) {
  return String(n).padStart(2, '0');
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const stage = document.querySelector('.stage');
const grid = document.querySelector('.grid');
const gridStatus = document.querySelector('.grid-status');
const filterBtns = document.querySelectorAll('.filter-btn');

// avisa quando o intro terminou (ou se já terminou)
function whenIntroDone(fn) {
  if (document.documentElement.classList.contains('intro-done')) fn();
  else document.addEventListener('intro:done', fn, { once: true });
}


// CARREGA AS FOTOS

fetch('photos.json')
  .then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  })
  .then(function (photos) {
    grid.removeAttribute('aria-busy');

    if (!photos.length) {
      gridStatus.textContent = 'No photos yet. Check back soon.';
      return;
    }

    hideEmptyFilters(photos);

    if (!initStage(photos)) {
      stage.classList.add('is-fallback');
      initGrid(photos);
    }
  })
  .catch(function () {
    stage.classList.add('is-fallback');
    grid.removeAttribute('aria-busy');
    gridStatus.textContent = 'The photos couldn’t load. Refresh the page to try again.';
    gridStatus.classList.add('is-error');
  });


// FILTROS (compartilhados entre o carrossel e a grade)

let onFilter = function () {};

function hideEmptyFilters(photos) {
  const used = new Set(photos.map(function (p) { return p.category; }));
  filterBtns.forEach(function (btn) {
    const f = btn.dataset.filter;
    if (f !== 'all' && !used.has(f)) btn.hidden = true;
  });
  // com uma categoria só, o filtro não ajuda em nada
  if (used.size < 2) document.querySelector('.filters').hidden = true;
}

filterBtns.forEach(function (btn) {
  btn.addEventListener('click', function () {
    if (btn.classList.contains('active')) return;
    filterBtns.forEach(function (b) {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    onFilter(btn.dataset.filter);
  });
});


// CARROSSEL (filmstrip)

function initStage(photos) {
  if (typeof window.createFilmstrip !== 'function') return false;

  const mount = document.querySelector('.strip-mount');
  const region = document.querySelector('.stage-carousel');
  const cursor = document.querySelector('.strip-cursor');
  const live = document.getElementById('stage-live');
  const caption = document.querySelector('.stage-caption');
  const captionTitle = document.querySelector('.caption-title');
  const captionLocation = document.querySelector('.caption-location');
  const captionDate = document.querySelector('.caption-date');
  const counterCurrent = document.querySelector('.counter-current');
  const counterTotal = document.querySelector('.counter-total');
  const stageNav = document.querySelector('.stage-nav');
  const closeBtn = document.querySelector('.stage-close');

  let list = photos;
  let carousel = null;
  let active = 0;

  function describe(i) {
    const p = list[i];
    if (!p) return;
    captionTitle.textContent = p.alt || '';
    captionLocation.textContent = p.location || '';
    captionDate.textContent = p.date || '';
    captionLocation.hidden = !p.location;
    captionDate.hidden = !p.date;
    counterCurrent.textContent = pad(i + 1);
    counterTotal.textContent = pad(list.length);
    live.textContent = [p.alt, p.location, p.date].filter(Boolean).join(', ') +
      '. Photo ' + (i + 1) + ' of ' + list.length + '.';
  }

  function build(entry) {
    if (carousel) carousel.destroy();
    carousel = window.createFilmstrip(mount, {
      items: list.map(function (p) {
        return {
          src: cloudinary(p.url, 'f_auto,q_auto,h_1100'),
          full: cloudinary(p.url, FULL_TRANSFORM),
          aspect: p.width && p.height ? p.width / p.height : null
        };
      }),
      entry: entry,
      cursor: cursor,
      onActiveChange: function (i) {
        active = i;
        caption.classList.remove('is-changing');
        void caption.offsetWidth;
        caption.classList.add('is-changing');
        describe(i);
      },
      onFocusChange: function (open) {
        stage.classList.toggle('is-focused', open);
        closeBtn.hidden = !open;
        if (open) live.textContent = 'Enlarged. ' + live.textContent;
      }
    });
    stageNav.hidden = list.length < 2;
    describe(active);
    return !!carousel;
  }

  active = 0;
  if (!build(true)) return false;

  stage.classList.add('has-strip');
  gridStatus.hidden = true;

  whenIntroDone(function () {
    carousel.playEntry();
    // a legenda e a barra aparecem quando as fotos já subiram
    setTimeout(function () { stage.classList.add('is-ready'); }, reduceMotion ? 0 : 700);
  });
  if (reduceMotion) stage.classList.add('is-ready');

  document.getElementById('stage-prev').addEventListener('click', function () { carousel.previous(); });
  document.getElementById('stage-next').addEventListener('click', function () { carousel.next(); });
  closeBtn.addEventListener('click', function () {
    carousel.closeFocus();
    region.focus();
  });

  region.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); carousel.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); carousel.previous(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); carousel.toggleFocus(); }
    else if (e.key === 'Escape') { carousel.closeFocus(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && carousel && carousel.isFocused()) carousel.closeFocus();
  });

  let filterTimer = null;
  onFilter = function (filter) {
    clearTimeout(filterTimer);
    stage.classList.add('is-swapping');
    filterTimer = setTimeout(function () {
      list = photos.filter(function (p) { return filter === 'all' || p.category === filter; });
      active = 0;
      build(false);
      stage.classList.remove('is-focused');
      closeBtn.hidden = true;
      stage.classList.remove('is-swapping');
    }, reduceMotion ? 0 : 250);
  };

  return true;
}


// GRADE + LIGHTBOX (fallback)

const THUMB_WIDTHS = [600, 1000, 1400];
const THUMB_SIZES = '(max-width: 480px) calc(100vw - 40px), (max-width: 768px) calc(50vw - 32px), 380px';

function thumbSrcset(url) {
  return THUMB_WIDTHS.map(function (w) {
    return cloudinary(url, 'f_auto,q_auto,w_' + w) + ' ' + w + 'w';
  }).join(', ');
}

function initGrid(photos) {
  grid.innerHTML = photos.map(function (photo) {
    const label = [photo.alt, photo.location].filter(Boolean).join(', ');
    const size = photo.width && photo.height
      ? ' width="' + photo.width + '" height="' + photo.height + '"'
      : '';
    return (
      '<button type="button" class="photo-item"' +
      ' aria-label="Open photo: ' + escapeHtml(label) + '"' +
      ' data-category="' + escapeHtml(photo.category) + '"' +
      ' data-full="' + escapeHtml(cloudinary(photo.url, FULL_TRANSFORM)) + '"' +
      ' data-location="' + escapeHtml(photo.location) + '"' +
      ' data-date="' + escapeHtml(photo.date) + '">' +
      '<img src="' + escapeHtml(cloudinary(photo.url, 'f_auto,q_auto,w_1000')) + '"' +
      ' srcset="' + escapeHtml(thumbSrcset(photo.url)) + '"' +
      ' sizes="' + THUMB_SIZES + '"' +
      size +
      ' alt="' + escapeHtml(photo.alt) + '" loading="lazy" decoding="async" />' +
      '</button>'
    );
  }).join('');

  gridStatus.hidden = true;

  const photoItems = Array.from(document.querySelectorAll('.photo-item'));


  // FADE IN AO ROLAR

  if (reduceMotion || !('IntersectionObserver' in window)) {
    photoItems.forEach(function (item) { item.classList.add('visible'); });
  } else {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    photoItems.forEach(function (item) { observer.observe(item); });
  }


  // LIGHTBOX

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.createElement('img');
  lightboxImg.id = 'lightbox-img';
  lightboxImg.alt = '';
  lightbox.querySelector('.lightbox-content').prepend(lightboxImg);
  const lightboxLocation = document.getElementById('lightbox-location');
  const lightboxDate = document.getElementById('lightbox-date');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');

  let currentIndex = 0;
  let visibleItems = [];
  let lastTrigger = null;

  function getVisibleItems() {
    return photoItems.filter(function (item) { return !item.hidden; });
  }

  function preload(item) {
    if (item) new Image().src = item.dataset.full;
  }

  function setText(el, value) {
    el.textContent = value || '';
    el.hidden = !value;
  }

  function showPhoto(index) {
    const total = visibleItems.length;
    currentIndex = (index + total) % total;
    const item = visibleItems[currentIndex];
    const img = item.querySelector('img');

    // mostra na hora a miniatura já carregada e troca pela grande quando chegar
    const full = item.dataset.full;
    const pending = new Image();
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt;
    pending.onload = function () {
      if (visibleItems[currentIndex] === item) lightboxImg.src = full;
    };
    pending.src = full;

    setText(lightboxLocation, item.dataset.location);
    setText(lightboxDate, item.dataset.date);
    lightboxCounter.textContent = (currentIndex + 1) + ' / ' + total;

    if (total > 1) {
      preload(visibleItems[(currentIndex + 1) % total]);
      preload(visibleItems[(currentIndex - 1 + total) % total]);
    }
  }

  function openLightbox(item) {
    visibleItems = getVisibleItems();
    lastTrigger = item;
    showPhoto(visibleItems.indexOf(item));
    const single = visibleItems.length < 2;
    prevBtn.hidden = single;
    nextBtn.hidden = single;
    lightbox.classList.add('active');
    document.body.classList.add('lightbox-open');
    closeBtn.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.classList.remove('lightbox-open');
    if (lastTrigger) lastTrigger.focus();
  }

  grid.addEventListener('click', function (e) {
    const item = e.target.closest('.photo-item');
    if (item) openLightbox(item);
  });

  prevBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    showPhoto(currentIndex - 1);
  });

  nextBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    showPhoto(currentIndex + 1);
  });

  closeBtn.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && visibleItems.length > 1) showPhoto(currentIndex - 1);
    if (e.key === 'ArrowRight' && visibleItems.length > 1) showPhoto(currentIndex + 1);

    // mantém o foco do Tab dentro do lightbox
    if (e.key === 'Tab') {
      const focusable = [closeBtn, prevBtn, nextBtn].filter(function (b) { return !b.hidden; });
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (focusable.indexOf(document.activeElement) === -1) {
        e.preventDefault();
        first.focus();
      }
    }
  });


  // FILTROS NA GRADE

  let filterTimer = null;
  onFilter = function (filter) {
    clearTimeout(filterTimer);
    grid.classList.add('is-fading');
    filterTimer = setTimeout(function () {
      photoItems.forEach(function (item) {
        item.hidden = !(filter === 'all' || item.dataset.category === filter);
      });
      grid.classList.remove('is-fading');
    }, reduceMotion ? 0 : 200);
  };


  // swipe do lightbox

  let touchStartX = 0;

  lightbox.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  lightbox.addEventListener('touchend', function (e) {
    if (visibleItems.length < 2) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) < 50) return;
    showPhoto(delta < 0 ? currentIndex + 1 : currentIndex - 1);
  }, { passive: true });
}


//  rolando e navegando
const nav = document.querySelector('nav');

function updateNav() {
  nav.classList.toggle('scrolled', window.scrollY > 50);
}

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();
