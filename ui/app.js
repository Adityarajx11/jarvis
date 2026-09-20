const chat = document.getElementById('chat');
const input = document.getElementById('input');
const welcome = document.getElementById('welcome');
const clock = document.getElementById('clock');
let speaking = false;

// Clock
setInterval(() => {
  clock.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}, 1000);

function addMessage(type, text) {
  if (welcome) welcome.remove();
  const d = document.createElement('div');
  d.className = 'msg ' + type;
  if (type === 'jarvis') d.innerHTML = `<span class="label">JARVIS</span>${escapeHtml(text)}`;
  else if (type === 'user') d.innerHTML = `<span class="label">YOU</span>${escapeHtml(text)}`;
  else d.textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d;
}

function addTyping() {
  const d = document.createElement('div');
  d.className = 'typing';
  d.innerHTML = '<span></span><span></span><span></span>';
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d;
}

function escapeHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>');
}

function showToast(html, ms = 5000) {
  const t = document.getElementById('toast');
  t.innerHTML = html;
  t.classList.add('show');
  clearTimeout(showToast._h);
  showToast._h = setTimeout(() => t.classList.remove('show'), ms);
}

async function send(text) {
  text = (text || input.value).trim();
  if (!text) return;
  input.value = '';
  addMessage('user', text);
  const typing = addTyping();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 120000);
    const r = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: ctl.signal
    });
    clearTimeout(timer);
    const { reply } = await r.json();
    typing.remove();
    addMessage('jarvis', reply || '(empty reply)');
    if (document.getElementById('voiceReply')?.checked) speak(reply || '');
    refreshSys();
  } catch (e) {
    typing.remove();
    const msg = e.name === 'AbortError' ? 'Request timed out (120s).' : 'Backend offline.';
    addMessage('jarvis error', msg);
  }
}
window.send = send;

// Send button
document.getElementById('send').onclick = () => send();
input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

// Quick commands
document.querySelectorAll('[data-cmd]').forEach(b => b.onclick = () => send(b.dataset.cmd));

// Mic
const micBtn = document.getElementById('mic');
micBtn.onclick = () => {
  stopTalking();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return showToast('Voice input needs Chrome or Edge.');
  if (micBtn._rec) { micBtn._rec.stop(); return; }
  const rec = new SR();
  micBtn._rec = rec;
  rec.lang = 'en-IN';
  rec.interimResults = false;
  document.body.classList.add('voice-active');
  rec.onresult = e => { stopTalking(); send(e.results[0][0].transcript); };
  rec.onerror = rec.onend = () => { micBtn._rec = null; document.body.classList.remove('voice-active'); };
  rec.start();
};

function orbTalk(on) {
  try { window.jarvisTalking = !!on; } catch {}
}

function stopTalking() {
  try { speechSynthesis.cancel(); } catch {}
  speaking = false;
  orbTalk(false);
}

function speak(t) {
  stopTalking();
  try {
    const u = new SpeechSynthesisUtterance(t.slice(0, 300));
    u.rate = 1.0;
    u.pitch = 0.9;
    const voices = speechSynthesis.getVoices().filter(v => v.lang?.startsWith('en'));
    const selName = document.getElementById('voicePick')?.value;
    u.voice = voices.find(v => v.name === selName)
      || (() => { const pref = ['Google US English', 'Microsoft Guy', 'Microsoft Aria', 'Daniel'];
           for (const p of pref) { const v = voices.find(v => v.name.includes(p)); if (v) return v; }
           return voices[0]; })();
    u.onstart = () => { speaking = true; orbTalk(true); };
    u.onboundary = () => { try { window.jarvisWordAt = performance.now(); } catch {} };
    u.onend = u.onerror = () => { speaking = false; orbTalk(false); };
    speechSynthesis.speak(u);
  } catch {}
}

// Tasks
document.getElementById('tadd').onclick = async () => {
  const inp = document.getElementById('tinput');
  const v = inp.value.trim();
  if (!v) return;
  inp.value = '';
  await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', text: v }) });
  refreshRoadmap();
};
document.getElementById('tinput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('tadd').click(); });



// Data refresh
async function refreshSys() {
  try {
    const s = await (await fetch('/api/system')).json();
    const bat = s.battery?.replace('Battery at ', '').replace('.', '') || '--';
    document.getElementById('bat-stat').textContent = 'BAT ' + bat;
    document.getElementById('side-bat').textContent = bat + '%';
    document.getElementById('sys-tasks').textContent = s.openTasks + ' tasks';
    document.getElementById('sys-projects').textContent = s.projects + ' projects';
    const u = s.uptime;
    const up = `${Math.floor(u/3600)}h ${Math.floor(u%3600/60)}m`;
    document.getElementById('sys-uptime').textContent = 'up ' + up;
    document.getElementById('side-uptime').textContent = up;
  } catch {}
  try {
    const sm = await (await fetch('/api/sysmonitor')).json();
    const cpu = Math.round(sm.cpu) + '%';
    const ram = Math.round(sm.mem) + '%';
    document.getElementById('cpu-stat').textContent = 'CPU ' + cpu;
    document.getElementById('ram-stat').textContent = 'RAM ' + ram;
    document.getElementById('side-cpu').textContent = cpu;
    document.getElementById('side-ram').textContent = ram;
  } catch {}
}

async function refreshRoadmap() {
  try {
    const { tasks } = await (await fetch('/api/tasks')).json();
    const list = document.getElementById('rm-list');
    const open = tasks.filter(t => !t.done), done = tasks.filter(t => t.done);
    const pct = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;
    document.getElementById('rm-fill').style.width = pct + '%';
    document.getElementById('rm-count').textContent = tasks.length ? `${done.length}/${tasks.length} tasks · ${pct}%` : 'No tasks yet';
    list.innerHTML = '';
    [...open, ...done.slice(-5)].forEach(t => {
      const d = document.createElement('div');
      d.className = 'rm-item' + (t.done ? ' done' : '');
      d.innerHTML = `<button>${t.done ? '&#10003;' : '&#9675;'}</button><span>${escapeHtml(t.text)}</span>`;
      if (!t.done) d.querySelector('button').onclick = async () => {
        await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', match: String(t.id) }) });
        refreshRoadmap(); refreshSys();
      };
      list.appendChild(d);
    });
  } catch {}
}



async function pollReminders() {
  try {
    const { due } = await (await fetch('/api/reminders')).json();
    (due || []).forEach(r => {
      showToast(`<b>Reminder:</b> ${escapeHtml(r.text)}`, 10000);
      addMessage('jarvis', `Reminder: ${r.text}`);
      speak(`Reminder: ${r.text}`);
    });
    if ((due || []).length) refreshRoadmap();
  } catch {}
}

// Load voices
speechSynthesis.onvoiceschanged = () => {
  const sel = document.getElementById('voicePick');
  if (!sel) return;
  const prev = sel.value;
  const voices = speechSynthesis.getVoices().filter(v => v.lang?.startsWith('en'));
  sel.innerHTML = '';
  voices.forEach(v => { const o = document.createElement('option'); o.value = v.name; o.textContent = v.name; sel.appendChild(o); });
  const pref = ['Google US English', 'Microsoft Guy', 'Microsoft Aria', 'Daniel'];
  sel.value = (prev && [...sel.options].some(o => o.value === prev)) ? prev
    : (pref.map(p => voices.find(v => v.name.includes(p))?.name).find(Boolean) || voices[0]?.name || '');
  sel.onchange = () => speak('Hello, I am Jarvis.');
};

// Init
refreshSys(); refreshRoadmap(); pollReminders();
setInterval(refreshSys, 30000);
setInterval(pollReminders, 10000);

// 3D background
(function() {
  return; // orb removed
  if (!window.THREE) return;
  try {
    const canvas = document.getElementById('scene');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(50, 2, 0.1, 100);
    cam.position.set(0, 0.4, 5);

    const GOLD = 0xffbe45;

    // Glow texture - warm gold
    function makeGlow() {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,252,235,1)');
      g.addColorStop(0.08, 'rgba(255,214,120,0.95)');
      g.addColorStop(0.25, 'rgba(255,183,50,0.5)');
      g.addColorStop(0.5, 'rgba(200,130,30,0.15)');
      g.addColorStop(1, 'rgba(80,50,10,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    }
    const gtex = makeGlow();

    // Core - warm white, ~0.3x outer radius like the reference
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 32), new THREE.MeshBasicMaterial({ color: 0xfffdf4 }));
    scene.add(core);
    const coreInner = new THREE.Mesh(new THREE.SphereGeometry(0.44, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffd977, transparent: true, opacity: 0.55 }));
    scene.add(coreInner);
    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    coreGlow.scale.setScalar(2.2);
    scene.add(coreGlow);

    // Spark orbiting the core - makes the middle visibly alive
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    spark.scale.setScalar(0.5);
    scene.add(spark);

    // Dotted sphere: points laid on a lat/long grid, like the reference
    function dotSphere(radius, latCount, lonCount, size, opacity) {
      const pos = [];
      for (let i = 1; i < latCount; i++) {
        const phi = (i / latCount) * Math.PI;
        const y = radius * Math.cos(phi);
        const r = radius * Math.sin(phi);
        for (let j = 0; j < lonCount; j++) {
          const a = (j / lonCount) * Math.PI * 2;
          pos.push(r * Math.cos(a), y, r * Math.sin(a));
        }
      }
      pos.push(0, radius, 0, 0, -radius, 0);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: GOLD, size: size, transparent: true, opacity: opacity, blending: THREE.AdditiveBlending, depthWrite: false });
      return new THREE.Points(geo, mat);
    }

    // Two nested dotted shells - distinct dots with dark grid gaps, like the reference
    const dotSpheres = [
      dotSphere(1.25, 110, 220, 0.008, 0.9),
      dotSphere(0.85, 80, 160, 0.0075, 0.9)
    ];
    dotSpheres.forEach(s => scene.add(s));

    // Glowing orbit rings (thin luminous tubes, near-horizontal like the reference)
    function flatRing(radius, tiltX, tiltZ, opacity, tube) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 8, 220),
        new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: opacity, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.x = Math.PI / 2 + tiltX;
      ring.rotation.z = tiltZ;
      return ring;
    }
    const orbitalRings = [];
    const ringConfigs = [
      { r: 1.75, tiltX: 0.22, tiltZ: 0.04, opacity: 0.9, tube: 0.01, speed: 0.08 },
      { r: 1.9, tiltX: 0.16, tiltZ: -0.05, opacity: 0.7, tube: 0.008, speed: -0.05 },
      { r: 2.05, tiltX: 0.28, tiltZ: 0.02, opacity: 0.5, tube: 0.007, speed: 0.03 },
      { r: 2.6, tiltX: 0.2, tiltZ: 0.0, opacity: 0.18, tube: 0.005, speed: 0.015 },
    ];
    ringConfigs.forEach(cfg => {
      const ring = flatRing(cfg.r, cfg.tiltX, cfg.tiltZ, cfg.opacity, cfg.tube);
      scene.add(ring);
      orbitalRings.push({ mesh: ring, speed: cfg.speed, bx: Math.PI / 2 + cfg.tiltX });
    });

    // Vertical pole line
    const poleGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.25, 0),
      new THREE.Vector3(0, -2.2, 0)
    ]);
    scene.add(new THREE.Line(poleGeo, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.3 })));

    // Halo
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(6);
    scene.add(halo);

    // Star dust - sparse, like the reference
    const starPos = new Float32Array(250 * 3);
    for (let i = 0; i < 250; i++) { starPos[i*3]=(Math.random()-0.5)*50; starPos[i*3+1]=(Math.random()-0.5)*40; starPos[i*3+2]=-5-Math.random()*25; }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffe2a8, size: 0.025, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));

    const resize = () => { renderer.setSize(innerWidth, innerHeight, true); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
    addEventListener('resize', resize); resize();

    (function anim() {
      requestAnimationFrame(anim);
      const t = performance.now() * 0.001;
      const pulse = 1 + Math.sin(t * 1.2) * 0.12 + Math.sin(t * 5.7) * 0.03;
      core.scale.setScalar(pulse);
      coreInner.scale.setScalar(pulse * 1.1);
      coreGlow.scale.setScalar(2.2 * pulse);
      halo.scale.setScalar(6 * (1 + Math.sin(t * 0.8) * 0.03));
      dotSpheres.forEach((s, i) => { s.rotation.y = t * (i === 0 ? 0.12 : -0.08); });
      // Rings precess (spin alone is invisible on a perfect circle)
      orbitalRings.forEach(r => { r.mesh.rotation.x = r.bx + Math.sin(t * r.speed * 2) * 0.06; });
      // Core motion: stronger breathe + orbiting spark
      core.position.y = Math.sin(t * 1.2) * 0.03;
      coreInner.position.y = core.position.y;
      const sa = t * 1.4;
      spark.position.set(Math.cos(sa) * 0.55, core.position.y + Math.sin(sa * 1.3) * 0.3, Math.sin(sa) * 0.55);
      spark.material.opacity = 0.6 + 0.4 * Math.abs(Math.sin(t * 5.7));
      cam.position.y = 0.4 + Math.sin(t * 0.2) * 0.06;
      cam.lookAt(0, 0, 0);
      renderer.render(scene, cam);
    })();
  } catch {}
})();

// Fullscreen golden dust (2D canvas behind everything)
(function() {
  try {
    const c = document.getElementById('dust');
    if (!c) return;
    const x = c.getContext('2d');
    const N = 300;
    const ps = [];
    const size = () => { c.width = innerWidth; c.height = innerHeight; };
    addEventListener('resize', size); size();
    for (let i = 0; i < N; i++) ps.push({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.6 + 0.4, s: Math.random() * 0.25 + 0.05, o: Math.random() * 0.5 + 0.15, ph: Math.random() * 6.28 });
    (function tick() {
      requestAnimationFrame(tick);
      const t = performance.now() * 0.001;
      x.clearRect(0, 0, c.width, c.height);
      ps.forEach(p => {
        p.y -= p.s; p.x += Math.sin(t * 0.5 + p.ph) * 0.15;
        if (p.y < -4) { p.y = c.height + 4; p.x = Math.random() * c.width; }
        const tw = p.o * (0.6 + 0.4 * Math.sin(t * 2 + p.ph));
        x.beginPath();
        x.arc(p.x, p.y, p.r, 0, 6.29);
        x.fillStyle = 'rgba(255,200,90,' + tw.toFixed(3) + ')';
        x.fill();
      });
    })();
  } catch {}
})();
