// FLIPPING WORD SWAP + INTRO
// Port em JS puro do componente "Flipping Word Swap" (componentry.dev):
// cada letra gira no eixo X; a palavra nova entra 62% depois da antiga começar a sair.

const EASE_IN = 'cubic-bezier(0.32, 0, 0.67, 0)';   // power2.in
const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';  // power2.out

function splitChars(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(seg.segment(text), function (s) { return s.segment; });
  }
  return Array.from(text);
}

// monta as duas camadas dentro de `el` e devolve { play, reverse }
function createFlipWord(el, word1, word2, options) {
  const opts = options || {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 1ms (não 0) com "reduzir movimento": uma animação de duração zero fica presa no estado final
  const duration = reduced ? 1 : Math.max(180, opts.duration || 400);
  const stagger = reduced ? 0 : Math.max(0, opts.stagger == null ? 44 : opts.stagger);

  el.classList.add('flip-word');
  el.textContent = '';

  function layer(text, name) {
    const wrap = document.createElement('span');
    wrap.className = 'flip-layer flip-layer--' + name;
    wrap.setAttribute('aria-hidden', 'true');
    return {
      wrap: wrap,
      chars: splitChars(text).map(function (ch) {
        const span = document.createElement('span');
        span.className = 'flip-char';
        span.textContent = ch === ' ' ? ' ' : ch;
        wrap.appendChild(span);
        return span;
      })
    };
  }

  const stage = document.createElement('span');
  stage.className = 'flip-stage';
  const first = layer(word1, 'first');
  const second = layer(word2, 'second');
  stage.appendChild(first.wrap);
  stage.appendChild(second.wrap);
  el.appendChild(stage);

  // estado inicial (igual ao gsap.set do original)
  first.chars.forEach(function (c) {
    c.style.transformOrigin = 'center top';
  });
  second.chars.forEach(function (c) {
    c.style.transformOrigin = 'center bottom';
    c.style.transform = 'rotateX(-82deg)';
    c.style.opacity = '0';
  });

  let anims = [];

  function build() {
    anims = [];
    first.chars.forEach(function (c, i) {
      anims.push(c.animate(
        [{ transform: 'rotateX(0deg)', opacity: 1 }, { transform: 'rotateX(82deg)', opacity: 0 }],
        { duration: duration, delay: i * stagger, easing: EASE_IN, fill: 'both' }
      ));
    });
    const offset = duration * 0.62;
    second.chars.forEach(function (c, i) {
      anims.push(c.animate(
        [{ transform: 'rotateX(-82deg)', opacity: 0 }, { transform: 'rotateX(0deg)', opacity: 1 }],
        { duration: duration, delay: offset + i * stagger, easing: EASE_OUT, fill: 'both' }
      ));
    });
    anims.forEach(function (a) { a.pause(); });
  }

  build();

  let swapped = false;

  function play() {
    if (swapped) return;
    swapped = true;
    anims.forEach(function (a) { a.playbackRate = 1; a.play(); });
  }

  function reverse() {
    if (!swapped) return;
    swapped = false;
    anims.forEach(function (a) { a.playbackRate = -1; a.play(); });
  }

  function finished() {
    return Promise.all(anims.map(function (a) { return a.finished; }));
  }

  return { play: play, reverse: reverse, finished: finished };
}


// INTRO: "Gabriel" vira "Buzzi" e a cortina sobe, a cada carregamento

(function () {
  const root = document.documentElement;
  const intro = document.getElementById('intro');

  function finish() {
    root.classList.remove('intro-active');
    root.classList.add('intro-done');
    document.dispatchEvent(new CustomEvent('intro:done'));
    if (intro) {
      setTimeout(function () { intro.hidden = true; }, 900);
    }
  }

  // o <head> só marca .intro-active quando há animação e o usuário não pediu menos movimento
  if (!intro || !root.classList.contains('intro-active') || !('animate' in Element.prototype)) {
    if (intro) intro.hidden = true;
    root.classList.remove('intro-active');
    root.classList.add('intro-done');
    // avisa no próximo tick, depois que os outros scripts registrarem o listener
    setTimeout(function () { document.dispatchEvent(new CustomEvent('intro:done')); }, 0);
    return;
  }

  const word = intro.querySelector('.intro-word');
  const flip = createFlipWord(word, 'Gabriel', 'Buzzi', { duration: 520, stagger: 56 });

  let done = false;
  const timers = [];

  function leave() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    intro.classList.add('is-leaving');
    finish();
  }

  timers.push(setTimeout(flip.play, 700));
  timers.push(setTimeout(leave, 2100));

  // pular: clique, toque ou qualquer tecla
  intro.addEventListener('click', leave);
  window.addEventListener('keydown', leave, { once: true });
})();
