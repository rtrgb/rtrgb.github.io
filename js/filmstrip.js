// FILMSTRIP
// Carrossel plano em DOM: a foto central em destaque, as vizinhas menores e escurecidas.
// Sem WebGL e sem distorção; as fotos aparecem exatamente como foram tiradas.
// createFilmstrip(mount, options) devolve { next, previous, toggleFocus, closeFocus, isFocused, playEntry, destroy }.

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SIDE_SCALE = 0.86;    // tamanho das vizinhas
  const SIDE_OPACITY = 0.32;  // brilho das vizinhas
  const SETTLE = 0.12;        // segundos até assentar (quanto menor, mais rápido)
  const FOCUS_SETTLE = 0.16;
  const DRAG_SLOP = 6;
  const WINDOW = 5;           // quantas fotos de cada lado podem aparecer

  function mod(a, n) { return ((a % n) + n) % n; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function expoOut(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  window.createFilmstrip = function (mount, options) {
    const items = options.items || [];
    const N = items.length;
    if (!N) return null;

    const onActiveChange = options.onActiveChange || function () {};
    const onFocusChange = options.onFocusChange || function () {};
    const cursorEl = options.cursor || null;

    // repete a lista para o loop infinito nunca mostrar a mesma foto duas vezes na tela
    const P = N < 2 ? N : N * Math.ceil((WINDOW * 2 + 1) / N);
    const M = Math.min(WINDOW, Math.floor((P - 1) / 2));

    const track = document.createElement('div');
    track.className = 'strip-track';
    track.setAttribute('aria-hidden', 'true');

    const slides = [];
    for (let k = 0; k < P; k++) {
      const item = items[k % N];
      const el = document.createElement('div');
      el.className = 'strip-slide';
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      img.addEventListener('load', function () { el.classList.add('is-loaded'); });
      img.src = item.src;
      if (img.complete && img.naturalWidth) el.classList.add('is-loaded');
      el.appendChild(img);
      track.appendChild(el);
      slides.push({ el: el, img: img, src: k % N, hires: false, shown: true });
    }
    mount.appendChild(track);

    // ---------- medidas ----------
    let W = 1;
    let H = 1;
    let panelH = 1;
    let gap = 16;
    const maxAspect = items.reduce(function (m, it) { return Math.max(m, it.aspect || 1.5); }, 1);

    function aspectOf(k) { return items[k % N].aspect || 1.5; }

    function measure() {
      W = Math.max(1, mount.clientWidth);
      H = Math.max(1, mount.clientHeight);
      const mobile = W <= 768;
      gap = mobile ? 12 : clamp(Math.round(W * 0.014), 14, 28);
      const byWidth = (W * (mobile ? 0.88 : 0.62)) / maxAspect;
      panelH = Math.round(clamp(Math.min(H * (mobile ? 0.46 : 0.56), byWidth, 760), 140, 760));
      slides.forEach(function (s, k) {
        s.el.style.width = Math.round(aspectOf(k) * panelH) + 'px';
        s.el.style.height = panelH + 'px';
      });
    }

    // posição vertical do centro das fotos (normal e ampliada)
    function restCY() { return H * (W <= 768 ? 0.5 : 0.46); }
    function focusBox() {
      const top = W <= 768 ? 72 : 88;
      const bottom = W <= 768 ? 190 : 176;
      return { cy: top + (H - top - bottom) / 2, w: W - (W <= 768 ? 24 : 96), h: H - top - bottom };
    }

    // ---------- estado ----------
    let pos = 0;          // índice contínuo (pode passar de P; o loop usa mod)
    let target = 0;
    let focusT = 0;
    let focusTarget = 0;
    let lastActive = -1;
    let entry = options.entry && !reduceMotion ? 'waiting' : 'done';
    let entryStart = 0;
    let destroyed = false;

    function activeIndex() { return Math.round(pos); }

    function scaleAt(d) { return 1 - (1 - SIDE_SCALE) * Math.min(1, Math.abs(d)); }
    function opacityAt(d) { return 1 - (1 - SIDE_OPACITY) * Math.min(1, Math.abs(d)); }

    function fitScale(k) {
      const b = focusBox();
      const w = aspectOf(k) * panelH;
      return Math.max(1, Math.min(b.w / w, b.h / panelH));
    }

    // ---------- desenho ----------
    function layout(now) {
      const c = Math.round(pos);
      const f = pos - c;
      const box = focusBox();
      const cy = restCY() + (box.cy - restCY()) * focusT;

      // larguras efetivas de -M..M, já com escala e ampliação
      const js = [];
      for (let j = -M; j <= M; j++) {
        const k = mod(c + j, P);
        const d = j - f;
        const near = Math.max(0, 1 - Math.abs(d));
        const s = scaleAt(d) * (1 + (fitScale(k) - 1) * focusT * near);
        js.push({ j: j, k: k, d: d, s: s, w: aspectOf(k) * panelH * s });
      }
      const xs = new Array(js.length);
      xs[M] = 0;
      for (let i = M + 1; i < js.length; i++) xs[i] = xs[i - 1] + (js[i - 1].w + js[i].w) / 2 + gap;
      for (let i = M - 1; i >= 0; i--) xs[i] = xs[i + 1] - (js[i + 1].w + js[i].w) / 2 - gap;
      const ref = M === 0 ? 0 : (f >= 0 ? f * xs[M + 1] : -f * xs[M - 1]);

      const inWindow = {};
      js.forEach(function (o, i) {
        const s = slides[o.k];
        inWindow[o.k] = true;
        const w = aspectOf(o.k) * panelH;
        const x = W / 2 + xs[i] - ref - w / 2;
        let y = cy - panelH / 2;
        let op = opacityAt(o.d) * (1 - focusT * Math.min(1, Math.abs(o.d)));

        if (entry !== 'done') {
          const delay = Math.abs(o.j) * 0.09;
          const t = entry === 'waiting' ? 0 : clamp((now - entryStart) / 1000 - delay, 0, 1.1) / 1.1;
          const e = expoOut(t);
          y += (1 - e) * 48;
          op *= e;
        }

        s.el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + o.s.toFixed(4) + ')';
        s.el.style.opacity = op.toFixed(3);
        s.el.style.zIndex = String(10 - Math.abs(o.j));
        s.el.classList.toggle('is-active', o.j === 0);
        if (!s.shown) { s.el.style.visibility = ''; s.shown = true; }
      });
      slides.forEach(function (s, k) {
        if (!inWindow[k] && s.shown) { s.el.style.visibility = 'hidden'; s.shown = false; }
      });

      const a = mod(c, N);
      if (a !== lastActive) {
        lastActive = a;
        onActiveChange(a);
      }
      if (focusTarget > 0) loadHires(mod(c, P));
    }

    // versão em alta só quando a foto é ampliada
    function loadHires(k) {
      const s = slides[k];
      const full = items[s.src].full;
      if (s.hires || !full) return;
      s.hires = true;
      const pre = new Image();
      pre.onload = function () { if (!destroyed) s.img.src = full; };
      pre.src = full;
    }

    // ---------- animação ----------
    let raf = 0;
    let lastT = 0;

    function frame(now) {
      raf = 0;
      if (destroyed) return;
      const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
      lastT = now;

      if (!dragging) {
        if (reduceMotion) pos = target;
        else pos += (target - pos) * (1 - Math.exp(-dt / SETTLE));
        if (Math.abs(target - pos) < 0.0005) pos = target;
      }
      if (reduceMotion) focusT = focusTarget;
      else focusT += (focusTarget - focusT) * (1 - Math.exp(-dt / FOCUS_SETTLE));
      if (Math.abs(focusTarget - focusT) < 0.001) focusT = focusTarget;

      if (entry === 'running' && (now - entryStart) / 1000 > 1.1 + M * 0.09) entry = 'done';

      layout(now);

      const busy = dragging || pos !== target || focusT !== focusTarget || entry === 'running';
      if (busy) raf = requestAnimationFrame(frame);
      else lastT = 0;
    }

    function kick() {
      if (!raf && !destroyed) raf = requestAnimationFrame(frame);
    }

    // ---------- ampliar ----------
    function openFocus() {
      if (focusTarget === 1) return;
      target = Math.round(target);
      focusTarget = 1;
      hideCursor();
      updateCursorStyle();
      onFocusChange(true, mod(Math.round(target), N));
      kick();
    }

    function closeFocus() {
      if (focusTarget === 0) return;
      focusTarget = 0;
      updateCursorStyle();
      onFocusChange(false, mod(Math.round(target), N));
      kick();
    }

    function step(dir) {
      if (N < 2 || entry !== 'done') return;
      target = Math.round(target) + dir;
      kick();
    }

    // ---------- entrada do usuário ----------
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startPos = 0;
    let moved = 0;
    let lastX = 0;
    let lastMoveT = 0;
    let vel = 0;           // fotos por ms
    let suppressClick = false;

    function pitch() { return aspectOf(mod(Math.round(pos), P)) * panelH + gap; }

    function slideFromEvent(e) {
      const el = e.target.closest ? e.target.closest('.strip-slide') : null;
      if (!el) return null;
      const k = slides.findIndex(function (s) { return s.el === el; });
      if (k < 0) return null;
      // j relativo à foto ativa, pelo caminho mais curto do loop
      let j = mod(k - Math.round(pos), P);
      if (j > P / 2) j -= P;
      return { k: k, j: j };
    }

    function onPointerDown(e) {
      if (e.button !== 0 || N < 2 || focusTarget > 0 || entry !== 'done') return;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startPos = pos;
      moved = 0;
      vel = 0;
      lastMoveT = performance.now();
    }

    function onPointerMove(e) {
      if (pointerId !== null && e.pointerId === pointerId) {
        const dx = e.clientX - startX;
        moved = Math.max(moved, Math.abs(dx));
        if (!dragging && moved > DRAG_SLOP) {
          dragging = true;
          try { mount.setPointerCapture(pointerId); } catch (err) { /* sem captura */ }
          mount.classList.add('is-dragging');
          hideCursor();
        }
        if (dragging) {
          const now = performance.now();
          const dtm = Math.max(1, now - lastMoveT);
          vel = vel * 0.5 + (-(e.clientX - lastX) / pitch() / dtm) * 0.5;
          lastX = e.clientX;
          lastMoveT = now;
          pos = startPos - dx / pitch();
          target = pos;
          kick();
        }
        return;
      }
      if (e.pointerType === 'mouse') moveCursor(e);
    }

    function onPointerUp(e) {
      if (pointerId === null || (e && e.pointerId !== pointerId)) return;
      pointerId = null;
      if (!dragging) return;
      dragging = false;
      mount.classList.remove('is-dragging');
      suppressClick = true;
      // um gesto rápido ou um empurrão curto passa exatamente uma foto
      const flick = performance.now() - lastMoveT < 90 && Math.abs(vel) * 220 > 0.3;
      let to = Math.round(pos);
      const from = Math.round(startPos);
      if (to === from && (flick || Math.abs(pos - startPos) > 0.12)) to += pos > startPos ? 1 : -1;
      target = to;
      kick();
    }

    function onClick(e) {
      if (suppressClick) { suppressClick = false; return; }
      if (focusTarget > 0) { closeFocus(); return; }
      if (entry !== 'done') return;
      const hit = slideFromEvent(e);
      if (!hit) return;
      if (hit.j === 0) openFocus();
      else { target = Math.round(target) + hit.j; kick(); }
    }

    // trackpad: rolagem horizontal move a faixa, a vertical continua rolando a página
    let wheelTimer = 0;
    function onWheel(e) {
      if (N < 2 || focusTarget > 0 || entry !== 'done') return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      pos += e.deltaX / pitch();
      target = pos;
      kick();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { target = Math.round(pos); kick(); }, 120);
    }

    // rótulo "View" que acompanha o mouse sobre a foto central
    function moveCursor(e) {
      if (!cursorEl) return;
      const hit = focusTarget === 0 && !dragging && entry === 'done' ? slideFromEvent(e) : null;
      const r = mount.getBoundingClientRect();
      cursorEl.style.transform = 'translate(' + (e.clientX - r.left + 16) + 'px,' + (e.clientY - r.top + 18) + 'px)';
      cursorEl.classList.toggle('is-visible', !!hit && hit.j === 0);
    }
    function hideCursor() { if (cursorEl) cursorEl.classList.remove('is-visible'); }
    function updateCursorStyle() { mount.classList.toggle('is-focused', focusTarget > 0); }

    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerup', onPointerUp);
    mount.addEventListener('pointercancel', onPointerUp);
    mount.addEventListener('pointerleave', hideCursor);
    mount.addEventListener('click', onClick);
    mount.addEventListener('wheel', onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(function () {
      measure();
      kick();
    });
    resizeObserver.observe(mount);

    measure();
    layout(performance.now());

    function playEntry() {
      if (entry !== 'waiting') return;
      entry = 'running';
      entryStart = performance.now();
      kick();
    }

    function destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      clearTimeout(wheelTimer);
      resizeObserver.disconnect();
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerup', onPointerUp);
      mount.removeEventListener('pointercancel', onPointerUp);
      mount.removeEventListener('pointerleave', hideCursor);
      mount.removeEventListener('click', onClick);
      mount.removeEventListener('wheel', onWheel);
      mount.classList.remove('is-focused', 'is-dragging');
      hideCursor();
      if (track.parentNode) track.parentNode.removeChild(track);
    }

    return {
      next: function () { step(1); },
      previous: function () { step(-1); },
      toggleFocus: function () { if (focusTarget > 0) closeFocus(); else if (entry === 'done') openFocus(); },
      closeFocus: closeFocus,
      isFocused: function () { return focusTarget > 0; },
      playEntry: playEntry,
      destroy: destroy
    };
  };
})();
