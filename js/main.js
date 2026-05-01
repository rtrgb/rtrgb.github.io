// ========================
// LIGHTBOX
// ========================
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxLocation = document.getElementById('lightbox-location');
const lightboxDate = document.getElementById('lightbox-date');
const closeBtn = document.getElementById('lightbox-close');

// Abre o lightbox ao clicar em qualquer foto
document.querySelector('.grid').addEventListener('click', function (e) {
  const item = e.target.closest('.photo-item');
  if (!item) return;

  const img = item.querySelector('img');
  lightboxImg.src = img.src;
  lightboxLocation.textContent = '📍 ' + item.dataset.location;
  lightboxDate.textContent = item.dataset.date;
  lightbox.classList.add('active');
});

// Fecha ao clicar no X
closeBtn.addEventListener('click', function () {
  lightbox.classList.remove('active');
});

// Fecha ao clicar fora da foto
lightbox.addEventListener('click', function (e) {
  if (e.target === lightbox) {
    lightbox.classList.remove('active');
  }
});

// Fecha com ESC
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    lightbox.classList.remove('active');
  }
});

// ========================
// FILTERS
// ========================
const filterBtns = document.querySelectorAll('.filter-btn');
const photoItems = document.querySelectorAll('.photo-item');

filterBtns.forEach(function (btn) {
  btn.addEventListener('click', function () {
    // Atualiza botão ativo
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    photoItems.forEach(function (item) {
      if (filter === 'all' || item.dataset.category === filter) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  });
});

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