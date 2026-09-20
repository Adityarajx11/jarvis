/* Velocity Kicks - Air Surge: 3D hero + configurator + cart + interactions */
(function() {
  'use strict';

  /* ---------- configurator ---------- */
  const COLORWAYS = {
    ember:   { base: '#ff5a00', accent: '#ffe9a8', sole: '#f5f2ea', glow: 0xff5a00, label: 'Ember' },
    volt:    { base: '#c8ff2e', accent: '#141414', sole: '#ffffff', glow: 0xa8e10c, label: 'Volt' },
    crimson: { base: '#e8102e', accent: '#ffb732', sole: '#1c1c22', glow: 0xe8102e, label: 'Crimson' }
  };
  let cw = 'ember';
  let size = 'UK 9';
  const PRICE = 7999;

  const sw = document.getElementById('swatches');
  sw.innerHTML = Object.entries(COLORWAYS).map(([k, c]) =>
    `<button type="button" data-cw="${k}" title="${c.label}" class="${k === cw ? 'on' : ''}" style="background:${c.base}"></button>`).join('');
  const sizes = document.getElementById('sizes');
  sizes.innerHTML = ['UK 6','UK 7','UK 8','UK 9','UK 10','UK 11'].map(s =>
    `<button type="button" data-size="${s}" class="${s === size ? 'on' : ''}">${s}</button>`).join('');

  function paint() {
    const c = COLORWAYS[cw];
    document.getElementById('shoe-base').setAttribute('fill', c.base);
    document.getElementById('shoe-accent').setAttribute('fill', c.accent);
    document.getElementById('shoe-sole').setAttribute('fill', c.sole);
    document.body.dataset.cw = cw;
    if (window.__hero) window.__hero(c.glow);
  }
  sw.addEventListener('click', e => {
    const b = e.target.closest('[data-cw]'); if (!b) return;
    cw = b.dataset.cw;
    sw.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    paint();
  });
  sizes.addEventListener('click', e => {
    const b = e.target.closest('[data-size]'); if (!b) return;
    size = b.dataset.size;
    sizes.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    document.getElementById('pickMsg').textContent = '';
  });

  /* ---------- cart ---------- */
  const cart = [];
  const drawer = document.getElementById('drawer');
  const money = n => '₹' + n.toLocaleString('en-IN');
  function renderCart() {
    const box = document.getElementById('cartItems');
    let total = 0;
    box.innerHTML = cart.length ? '' : '<p style="color:var(--dim)">Empty. Speed waits for no one.</p>';
    cart.forEach((it, i) => {
      total += it.price * it.qty;
      box.innerHTML += `<div class="ci"><span>Air Surge ${it.cw} · ${it.size} × ${it.qty}</span><span>${money(it.price * it.qty)} <button type="button" data-dec="${i}">−</button></span></div>`;
    });
    document.getElementById('cartCount').textContent = cart.reduce((a, b) => a + b.qty, 0);
    document.getElementById('cartTotal').textContent = money(total);
  }
  document.getElementById('addBtn').onclick = () => {
    if (!size) { document.getElementById('pickMsg').textContent = 'Pick a size first.'; return; }
    const found = cart.find(it => it.cw === cw && it.size === size);
    found ? found.qty++ : cart.push({ cw: COLORWAYS[cw].label, size, price: PRICE, qty: 1 });
    renderCart();
    drawer.classList.add('open');
  };
  document.addEventListener('click', e => {
    const dec = e.target.closest('[data-dec]');
    if (!dec) return;
    const it = cart[+dec.dataset.dec];
    it.qty-- ; if (it.qty <= 0) cart.splice(+dec.dataset.dec, 1);
    renderCart();
  });
  document.getElementById('cartBtn').onclick = () => drawer.classList.toggle('open');
  document.getElementById('closeDrawer').onclick = () => drawer.classList.remove('open');
  document.getElementById('checkoutBtn').onclick = () => {
    if (!cart.length) return;
    const total = document.getElementById('cartTotal').textContent;
    cart.length = 0; renderCart(); drawer.classList.remove('open');
    document.getElementById('pickMsg').textContent = `Order locked in (${total}). Laces out, delivery in 3–5 days.`;
  };
  renderCart();

  /* ---------- marquee ---------- */
  const words = ['AIR SURGE', 'ENGINEERED MOTION', 'CARBON PLATE', '212 GRAMS'];
  document.getElementById('stripTrack').innerHTML = Array(3).fill(words.map(w => `<span style="padding:0 26px">${w} ·</span>`).join('')).join('');

  /* ---------- gallery lightbox ---------- */
  const lb = document.getElementById('lightbox'), lbBody = document.getElementById('lbBody'), lbCap = document.getElementById('lbCap');
  document.getElementById('galGrid').addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    lbBody.style.background = getComputedStyle(card).background;
    lbCap.textContent = card.querySelector('h3').textContent + ' — Air Surge on location';
    lb.classList.add('open');
  });
  document.getElementById('lbClose').onclick = () => lb.classList.remove('open');
  lb.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('open'); });

  /* ---------- reviews slider ---------- */
  const REVIEWS = [
    ['Ran a 10K PB the first week. The plate genuinely pushes you forward.', '— Arjun M., Mumbai'],
    ['Volt colorway turns heads. Grip in rain is unreal.', '— Sara K., Bengaluru'],
    ['Worth every rupee. Size runs true, order your usual.', '— Dev P., Delhi']
  ];
  let ri = 0, rTimer = null;
  const revDots = document.getElementById('revDots');
  revDots.innerHTML = REVIEWS.map((_, i) => `<i data-r="${i}" class="${i === 0 ? 'on' : ''}"></i>`).join('');
  function showRev(i) {
    ri = (i + REVIEWS.length) % REVIEWS.length;
    document.getElementById('revText').textContent = '\u201C' + REVIEWS[ri][0] + '\u201D';
    document.getElementById('revName').textContent = REVIEWS[ri][1];
    revDots.querySelectorAll('i').forEach((d, j) => d.classList.toggle('on', j === ri));
  }
  function autoRev() { clearInterval(rTimer); rTimer = setInterval(() => showRev(ri + 1), 4000); }
  revDots.addEventListener('click', e => { const d = e.target.closest('[data-r]'); if (d) { showRev(+d.dataset.r); autoRev(); } });
  showRev(0); autoRev();

  /* ---------- reveal + counters ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  document.querySelectorAll('.card').forEach(c => io.observe(c));
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const end = +e.target.dataset.count, t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / 1200, 1);
      e.target.textContent = Math.round(end * p);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }), { threshold: 0.4 });
  document.querySelectorAll('[data-count]').forEach(b => cio.observe(b));

  /* ---------- signup ---------- */
  document.getElementById('signupBtn').onclick = () => {
    const v = document.getElementById('sEmail').value.trim();
    document.getElementById('signupMsg').textContent =
      /.+@.+\..+/.test(v) ? 'Locked in — 15% code heading to ' + v + '.' : 'Enter a valid email for the code.';
  };

  /* ---------- preloader ---------- */
  const fill = document.getElementById('loadFill'), pct = document.getElementById('loadPct');
  let lp = 0;
  const lt = setInterval(() => {
    lp = Math.min(lp + Math.random() * 22, 92);
    fill.style.width = lp + '%'; pct.textContent = Math.round(lp) + '%';
  }, 180);
  addEventListener('load', () => {
    clearInterval(lt);
    fill.style.width = '100%'; pct.textContent = '100%';
    setTimeout(() => document.getElementById('loader').classList.add('done'), 350);
  });
  setTimeout(() => document.getElementById('loader').classList.add('done'), 5000);

  /* ---------- 3D hero: knot + embers, mouse-reactive ---------- */
  window.__hero = null;
  (function hero3d() {
    if (!window.THREE) return;
    try {
      const canvas = document.getElementById('stage3d');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(60, 2, 0.1, 100);
      cam.position.set(0, 0, 10);

      const knot = new THREE.Mesh(
        new THREE.TorusKnotGeometry(2.2, 0.5, 140, 20),
        new THREE.MeshBasicMaterial({ color: 0xff5a00, wireframe: true, transparent: true, opacity: 0.35 })
      );
      scene.add(knot);

      const N = 260;
      const pos = new Float32Array(N * 3), seed = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 22;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 13;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
        seed[i] = Math.random() * 6.28;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xff5a00, size: 0.06, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
      scene.add(new THREE.Points(geo, mat));
      window.__hero = hex => { knot.material.color.setHex(hex); mat.color.setHex(hex); };

      let mx = 0, my = 0;
      addEventListener('pointermove', e => {
        mx = (e.clientX / innerWidth - 0.5) * 2;
        my = (e.clientY / innerHeight - 0.5) * 2;
      });
      const resize = () => {
        const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
        renderer.setSize(w, h, false);
        cam.aspect = w / h; cam.updateProjectionMatrix();
      };
      addEventListener('resize', resize); resize();

      (function anim() {
        requestAnimationFrame(anim);
        const t = performance.now() * 0.001;
        knot.rotation.x = t * 0.12 + my * 0.4;
        knot.rotation.y = t * 0.18 + mx * 0.6;
        const arr = geo.attributes.position.array;
        for (let i = 0; i < N; i++) {
          arr[i * 3 + 1] += 0.01;
          arr[i * 3] += Math.sin(t + seed[i]) * 0.005 + mx * 0.008;
          if (arr[i * 3 + 1] > 6.5) { arr[i * 3 + 1] = -6.5; arr[i * 3] = (Math.random() - 0.5) * 22; }
        }
        geo.attributes.position.needsUpdate = true;
        cam.position.x += (mx * 1.4 - cam.position.x) * 0.04;
        cam.position.y += (-my - cam.position.y) * 0.04;
        cam.lookAt(0, 0, 0);
        renderer.render(scene, cam);
      })();
    } catch (e) {}
  })();

  paint();
})();
