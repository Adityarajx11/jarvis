/* Spicy landing: 3D ember hero + menu cart + interactions */
(function() {
  'use strict';

  /* ---------- data ---------- */
  const MENU = [
    { id: 1, name: 'Fire Wings', price: 249, heat: 3, desc: 'Smoked wings glazed in habanero honey.' },
    { id: 2, name: 'Ghost Pepper Burger', price: 299, heat: 5, desc: 'Bhut jolokia mayo, double cheese, brioche.' },
    { id: 3, name: 'Chilli Paneer Sizzler', price: 229, heat: 2, desc: 'Charred peppers, spring onion, wok breath.' },
    { id: 4, name: 'Volcano Fries', price: 149, heat: 4, desc: 'Loaded fries under a lava-cheese pour.' },
    { id: 5, name: 'Lava Cake', price: 169, heat: 1, desc: 'Molten chilli-chocolate core, vanilla scoop.' },
    { id: 6, name: 'Mango Habanero Cooler', price: 119, heat: 2, desc: 'Alphonso mango meets a habanero whisper.' }
  ];
  const HEAT = {
    mild:   { speed: 0.5, color: 0xffb732, size: 0.05 },
    medium: { speed: 1.0, color: 0xff6a00, size: 0.06 },
    hot:    { speed: 1.7, color: 0xff2200, size: 0.075 }
  };
  let heatLevel = 'medium';

  /* ---------- menu render ---------- */
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = MENU.map(m =>
    `<div class="card"><h3>${m.name}</h3><div class="price">₹${m.price}</div><p>${m.desc}</p>` +
    `<div class="heat-dots">${[1,2,3,4,5].map(i => `<i class="${i <= m.heat ? 'lit' : ''}"></i>`).join('')}</div>` +
    `<button type="button" data-add="${m.id}">Add to cart</button></div>`
  ).join('');

  /* ---------- cart ---------- */
  const cart = new Map();
  const drawer = document.getElementById('drawer');
  const cartItems = document.getElementById('cartItems');
  const cartCount = document.getElementById('cartCount');
  const cartTotal = document.getElementById('cartTotal');
  const money = n => '₹' + n;

  function renderCart() {
    let count = 0, total = 0, html = '';
    cart.forEach((qty, id) => {
      const m = MENU.find(x => x.id === id);
      count += qty; total += qty * m.price;
      html += `<div class="ci"><span>${m.name} × ${qty}</span><span>${money(m.price * qty)} <button type="button" data-dec="${id}">−</button></span></div>`;
    });
    cartItems.innerHTML = html || '<p style="color:var(--dim)">Empty. The fire awaits.</p>';
    cartCount.textContent = count;
    cartTotal.textContent = money(total);
    drawer.setAttribute('aria-hidden', cart.size ? 'false' : 'true');
  }
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const id = +add.dataset.add;
      cart.set(id, (cart.get(id) || 0) + 1);
      renderCart();
      drawer.classList.add('open');
      return;
    }
    const dec = e.target.closest('[data-dec]');
    if (dec) {
      const id = +dec.dataset.dec;
      const q = (cart.get(id) || 0) - 1;
      q <= 0 ? cart.delete(id) : cart.set(id, q);
      renderCart();
    }
  });
  document.getElementById('cartBtn').onclick = () => drawer.classList.toggle('open');
  document.getElementById('closeDrawer').onclick = () => drawer.classList.remove('open');
  document.getElementById('toCheckout').onclick = () => drawer.classList.remove('open');
  renderCart();

  /* ---------- order ---------- */
  document.getElementById('placeOrder').onclick = () => {
    const name = document.getElementById('oName').value.trim();
    const msg = document.getElementById('orderMsg');
    if (!cart.size) { msg.textContent = 'Your cart is empty — add something fiery first.'; return; }
    if (!name) { msg.textContent = 'Tell us your name so we know who to feed.'; return; }
    const total = cartTotal.textContent;
    const id = 'SPC-' + Math.floor(1000 + Math.random() * 9000);
    msg.textContent = `Order ${id} locked in, ${name}! ${total} · arriving hot in ~35 min.`;
    cart.clear(); renderCart();
  };

  /* ---------- heat selector ---------- */
  document.querySelectorAll('.heat-pick button').forEach(b => b.onclick = () => {
    document.querySelectorAll('.heat-pick button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    heatLevel = b.dataset.heat;
    document.body.dataset.heat = heatLevel;
    applyHeat();
  });

  /* ---------- marquee ---------- */
  const words = ['EXTRA HOT', 'TASTE THE FIRE', 'SMOKED DAILY', 'ZERO SHORTCUTS'];
  document.getElementById('stripTrack').innerHTML = Array(3).fill(words.map(w => `<span style="padding:0 26px">${w} ·</span>`).join('')).join('');

  /* ---------- tilt + reveal + counters ---------- */
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -10;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 10;
      card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
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

  /* ---------- 3D ember hero ---------- */
  let emberMat = null, emberBaseSize = 0.06, emberSpeed = 1;
  function applyHeat() {
    const h = HEAT[heatLevel] || HEAT.medium;
    emberSpeed = h.speed;
    if (emberMat) { emberMat.color.setHex(h.color); emberMat.size = h.size; }
  }

  (function embers() {
    if (!window.THREE) return;
    try {
      const canvas = document.getElementById('embers');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(60, 2, 0.1, 100);
      cam.position.set(0, 0, 9);

      const N = 380;
      const pos = new Float32Array(N * 3);
      const seed = new Float32Array(N * 2);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 20;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
        seed[i * 2] = Math.random() * 6.28;
        seed[i * 2 + 1] = 0.3 + Math.random() * 0.7;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      emberMat = new THREE.PointsMaterial({ color: 0xff6a00, size: emberBaseSize, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      const pts = new THREE.Points(geo, emberMat);
      scene.add(pts);

      // slow-turning ember ring behind the headline
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.4, 0.02, 8, 140),
        new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.x = Math.PI / 2 - 0.25;
      scene.add(ring);

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
      applyHeat();

      (function anim() {
        requestAnimationFrame(anim);
        const t = performance.now() * 0.001;
        const arr = geo.attributes.position.array;
        for (let i = 0; i < N; i++) {
          const s1 = seed[i * 2], s2 = seed[i * 2 + 1];
          arr[i * 3 + 1] += 0.012 * emberSpeed * s2;                    // rise
          arr[i * 3] += Math.sin(t * 0.8 + s1) * 0.006 + mx * 0.01;     // sway + cursor push
          if (arr[i * 3 + 1] > 6.5) { arr[i * 3 + 1] = -6.5; arr[i * 3] = (Math.random() - 0.5) * 20; }
        }
        geo.attributes.position.needsUpdate = true;
        ring.rotation.z = t * 0.1;
        cam.position.x += (mx * 1.2 - cam.position.x) * 0.04;            // parallax
        cam.position.y += (-my * 0.8 - cam.position.y) * 0.04;
        cam.lookAt(0, 0, 0);
        renderer.render(scene, cam);
      })();
    } catch (e) {}
  })();
})();
