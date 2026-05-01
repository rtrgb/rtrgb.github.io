// ========================
// LIGHTBOX
// ========================
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const fechar = document.getElementById('lightbox-close');

// Abre o lightbox ao clicar em qualquer foto da galeria
document.querySelector('.grid').addEventListener('click', function (e) {
  if (e.target.tagName === 'IMG') {
    lightboxImg.src = e.target.src;
    lightbox.classList.add('ativo');
  }
});

// Fecha ao clicar no X
fechar.addEventListener('click', function () {
  lightbox.classList.remove('ativo');
});

// Fecha ao clicar fora da foto
lightbox.addEventListener('click', function (e) {
  if (e.target === lightbox) {
    lightbox.classList.remove('ativo');
  }
});

// Fecha com a tecla ESC
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    lightbox.classList.remove('ativo');
  }
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