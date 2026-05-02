// ========================
// FADE IN AO ROLAR
// ========================
const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.photo-item').forEach(function (item) {
  observer.observe(item);
});

// ========================
// LIGHTBOX
// ========================
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxLocation = document.getElementById('lightbox-location');
const lightboxDate = document.getElementById('lightbox-date');
const lightboxCounter = document.getElementById('lightbox-counter');
const closeBtn = document.getElementById('lightbox-close');
const prevBtn = document.getElementById('lightbox-prev');
const nextBtn = document.getElementById('lightbox-next');

let currentIndex = 0;
let visibleItems = [];

function getVisibleItems() {
  return Array.from(document.querySelectorAll('.photo-item')).filter(
    item => item.style.display !== 'none'
  );
}

function showPhoto(index) {
  currentIndex = index;
  const item = visibleItems[currentIndex];
  const img = item.querySelector('img');
  lightboxImg.src = img.src;
  lightboxLocation.textContent = '📍 ' + item.dataset.location;
  lightboxDate.textContent = item.dataset.date;
  lightboxCounter.textContent = (currentIndex + 1) + ' / ' + visibleItems.length;
}

document.querySelector('.grid').addEventListener('click', function (e) {
  const item = e.target.closest('.photo-item');
  if (!item) return;

  visibleItems = getVisibleItems();
  const index = visibleItems.indexOf(item);
  showPhoto(index);
  lightbox.classList.add('active');
});

prevBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
  showPhoto(currentIndex);
});

nextBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  currentIndex = (currentIndex + 1) % visibleItems.length;
  showPhoto(currentIndex);
});

closeBtn.addEventListener('click', function () {
  lightbox.classList.remove('active');
});

lightbox.addEventListener('click', function (e) {
  if (e.target === lightbox) {
    lightbox.classList.remove('active');
  }
});

document.addEventListener('keydown', function (e) {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape') lightbox.classList.remove('active');
  if (e.key === 'ArrowLeft') {
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    showPhoto(currentIndex);
  }
  if (e.key === 'ArrowRight') {
    currentIndex = (currentIndex + 1) % visibleItems.length;
    showPhoto(currentIndex);
  }
});

// ========================
// FILTERS
// ========================
const filterBtns = document.querySelectorAll('.filter-btn');
const photoItems = document.querySelectorAll('.photo-item');

const activeCategories = new Set(
  Array.from(photoItems).map(item => item.dataset.category)
);

filterBtns.forEach(function (btn) {
  const filter = btn.dataset.filter;
  if (filter !== 'all' && !activeCategories.has(filter)) {
    btn.style.display = 'none';
  }

  btn.addEventListener('click', function () {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    photoItems.forEach(function (item) {
      item.style.opacity = '0';
    });

    setTimeout(function () {
      photoItems.forEach(function (item) {
        if (filter === 'all' || item.dataset.category === filter) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });

      requestAnimationFrame(function () {
        photoItems.forEach(function (item) {
          if (item.style.display !== 'none') {
            item.style.opacity = '1';
          }
        });
      });
    }, 200);
  });
});

// ========================
// SWIPE NO LIGHTBOX
// ========================
let touchStartX = 0;

lightbox.addEventListener('touchstart', function (e) {
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });

lightbox.addEventListener('touchend', function (e) {
  const delta = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) < 50) return;
  if (delta < 0) {
    currentIndex = (currentIndex + 1) % visibleItems.length;
  } else {
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
  }
  showPhoto(currentIndex);
}, { passive: true });

// ========================
// NAVEGAÇÃO ao rolar
// ========================
window.addEventListener('scroll', function () {
  const nav = document.querySelector('nav');
  if (window.scrollY > 50) {
    nav.style.background = '#0a0a0a';
  } else {
    nav.style.background = 'linear-gradient(to bottom, #0a0a0a, transparent)';
  }
});
