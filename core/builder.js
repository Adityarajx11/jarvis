// Jarvis Builder: turn files + category + prompt into a real website/code project.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'projects');

function slug(s) {
  return (s || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'project';
}
function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }

// guess a nice title from prompt, e.g. "portfolio for Aarav" -> "Aarav"
function guessTitle(prompt, category) {
  const cm = prompt.match(/company\s+(?:called\s+|named\s+|name\s+)?([a-z][\w]*(?:\s+[a-z][\w]*){0,2})/i);
  if (cm) {
    const t = cm[1].replace(/(\s+(and|or|i|we|want|for|with|my))+$/i, '').trim();
    if (t) return t[0].toUpperCase() + t.slice(1);
  }
  const m = prompt.match(/(?:for|called|named|my name is|i am|i'm)\s+([A-Z][\w ]{1,30})/i);
  if (m) return m[1].trim();
  const defaults = { portfolio: 'My Portfolio', landing: 'Landing Page', restaurant: 'My Restaurant', blog: 'My Blog', todo: 'Todo App', custom: 'My Website' };
  return defaults[category] || 'My Website';
}

function shell(title, body, extraCSS = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
${body}
<script src="app.js"></script>
</body>
</html>
`;
}

const BASE_CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0b1220;color:#e8eef7;line-height:1.6}
header{padding:64px 24px;text-align:center;background:linear-gradient(135deg,#0ea5e9,#6366f1)}
header h1{font-size:2.6rem}header p{opacity:.9;margin-top:8px}
nav{display:flex;gap:20px;justify-content:center;padding:14px;background:#0f172a;position:sticky;top:0}
nav a{color:#7dd3fc;text-decoration:none;font-weight:600}
section{max-width:900px;margin:auto;padding:48px 24px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:20px}
.card{background:#111c33;border:1px solid #1e3a5f;border-radius:12px;padding:20px}
footer{text-align:center;padding:24px;opacity:.6}
button{background:#0ea5e9;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:1rem;cursor:pointer}
input,textarea{width:100%;padding:10px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;margin:6px 0}
`;

function themeCSS(prompt) {
  const p = (prompt || '').toLowerCase();
  if (/light|white|minimal/.test(p))
    return `\nbody{background:#f1f5f9;color:#0f172a}\nheader{background:linear-gradient(135deg,#38bdf8,#818cf8)}\nnav{background:#e2e8f0}nav a{color:#0369a1}\n.card{background:#fff;border-color:#cbd5e1}\ninput,textarea{background:#fff;color:#0f172a;border-color:#94a3b8}`;
  if (/neon|purple|cyberpunk/.test(p))
    return `\nbody{background:#0a0118}\nheader{background:linear-gradient(135deg,#d946ef,#22d3ee)}\n.card{border-color:#d946ef88;box-shadow:0 0 18px #d946ef33}\nbutton{background:linear-gradient(90deg,#d946ef,#22d3ee)}`;
  if (/green|matrix/.test(p))
    return `\nbody{background:#02120a}\nheader{background:linear-gradient(135deg,#16a34a,#052e16)}\n.card{border-color:#22c55e88}\nbutton{background:#16a34a}`;
  return '';
}

function template(category, title, prompt, assets) {
  const gallery = assets.filter(a => /\.(png|jpe?g|gif|webp|svg)$/i.test(a))
    .map(a => `<div class="card"><img src="assets/${a}" style="width:100%;border-radius:8px" /></div>`).join('\n');
  const filesNote = assets.length ? `<p>Your uploads: ${assets.join(', ')}</p>` : '';

  switch (category) {
    case 'portfolio': return {
      'index.html': shell(title, `<nav><a href="#about">About</a><a href="#work">Work</a><a href="#contact">Contact</a></nav>
<header><h1>${title}</h1><p>${prompt.slice(0, 120)}</p></header>
<section id="about"><h2>About me</h2><p>Hi, I'm ${title}. This portfolio was built for me by Jarvis. Edit this text in <b>index.html</b> to tell your story.</p>${filesNote}</section>
<section id="work"><h2>My work</h2><div class="cards">${gallery || '<div class="card">Project 1 — replace with yours</div><div class="card">Project 2 — replace with yours</div><div class="card">Project 3 — replace with yours</div>'}</div></section>
<section id="contact"><h2>Contact</h2><input id="n" placeholder="Your name" /><textarea id="m" placeholder="Message"></textarea><button onclick="send()">Send</button></section>
<footer>Built by Jarvis</footer>`),
      'style.css': BASE_CSS + themeCSS(prompt), 'app.js': `function send(){const n=document.getElementById('n').value||'friend';alert('Thanks '+n+'! (wire this to your email/backend next)');}`
    };
    case 'restaurant': return {
      'index.html': shell(title, `<nav><a href="#menu">Menu</a><a href="#about">About</a><a href="#book">Book table</a></nav>
<header><h1>${title}</h1><p>Delicious food, made with love.</p></header>
<section id="menu"><h2>Menu</h2><div class="cards">${gallery || '<div class="card"><h3>Dish 1</h3><p>₹199 — edit me</p></div><div class="card"><h3>Dish 2</h3><p>₹249 — edit me</p></div><div class="card"><h3>Dish 3</h3><p>₹299 — edit me</p></div>'}</div></section>
<section id="about"><h2>About us</h2><p>${prompt.slice(0, 160)}</p>${filesNote}</section>
<section id="book"><h2>Book a table</h2><input id="n" placeholder="Name" /><input id="d" placeholder="Date" /><button onclick="book()">Book</button></section>
<footer>Built by Jarvis</footer>`),
      'style.css': BASE_CSS + themeCSS(prompt), 'app.js': `function book(){alert('Table booked for '+document.getElementById('n').value+'! (demo — connect a backend next)');}`
    };
    case 'blog': return {
      'index.html': shell(title, `<nav><a href="#posts">Posts</a><a href="#write">Write</a></nav>
<header><h1>${title}</h1><p>Thoughts, stories, ideas.</p></header>
<section id="posts"><h2>Posts</h2><div id="list"><div class="card"><h3>First post</h3><p>Edit me in index.html or write below.</p></div></div></section>
<section id="write"><h2>Write a post</h2><input id="t" placeholder="Title" /><textarea id="b" placeholder="Body"></textarea><button onclick="publish()">Publish</button></section>
<footer>Built by Jarvis</footer>`),
      'style.css': BASE_CSS + themeCSS(prompt), 'app.js': `function publish(){const t=document.getElementById('t').value||'Untitled';const b=document.getElementById('b').value||'';const d=document.createElement('div');d.className='card';d.innerHTML='<h3>'+t+'</h3><p>'+b+'</p>';document.getElementById('list').prepend(d);}`
    };
    case 'todo': return {
      'index.html': shell(title, `<header><h1>${title}</h1><p>Stay organized.</p></header>
<section><input id="in" placeholder="New task..." /><button onclick="add()">Add</button><div id="list" class="cards"></div></section>
<footer>Built by Jarvis</footer>`),
      'style.css': BASE_CSS + themeCSS(prompt), 'app.js': `function add(){const v=document.getElementById('in').value.trim();if(!v)return;const d=document.createElement('div');d.className='card';d.innerHTML='<p>'+v+'</p>';d.onclick=()=>d.remove();document.getElementById('list').appendChild(d);document.getElementById('in').value='';}`
    };
    case 'landing':
    default: return {
      'index.html': shell(title, `<header><h1>${title}</h1><p>${prompt.slice(0, 140)}</p><br/><button onclick="cta()">Get started</button></header>
<section><h2>Features</h2><div class="cards"><div class="card">Fast</div><div class="card">Simple</div><div class="card">Yours</div></div></section>
<section><h2>Gallery</h2><div class="cards">${gallery || '<div class="card">Add your images — drop files when building</div>'}</div>${filesNote}</section>
<footer>Built by Jarvis</footer>`),
      'style.css': BASE_CSS + themeCSS(prompt), 'app.js': `function cta(){alert('Thanks for your interest! (wire this button to signup/payment next)');}`
    };
  }
}

function stepsFor(name) {
  return [
    `1. Preview: open http://localhost:PORT/projects/${name}/ in your browser (link below).`,
    `2. Edit: folder F:\\jarvis\\projects\\${name}\\ — right-click index.html > Open with VS Code.`,
    `3. Your uploads are in the assets/ folder, already linked in the page.`,
    `4. Publish free: drag the ${name} folder onto netlify.com/drop — live website in 30 seconds.`,
    `5. Changes? Tell me "rebuild ${name} with dark navbar" and I'll update it.`
  ];
}

// Groq cloud build: real AI-generated sites. Same scrambled key as brain.js (builder can't require brain: circular).
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const _kx = Buffer.from('V1pMOXJqZUlqb1RnbWRuNWRGNDUxUUNyWUYzYnlkR1dMMHNCMlE1MkRiUmRGaTdKSHVBSF9rc2c=', 'base64').toString('utf8').split('').reverse().join('');
const GROQ_KEY = process.env.JARVIS_GROQ_KEY || _kx;
const GROQ_MODEL = 'openai/gpt-oss-120b';

function parseFiles(text) {
  const files = {};
  const re = /###FILE:\s*([\w.\-]+)\s*\n([\s\S]*?)(?=###FILE:|$)/g;
  let m; while ((m = re.exec(text || ''))) files[m[1].trim()] = m[2].replace(/```\w*/g, '').replace(/```/g, '').trim();
  return files['index.html'] ? files : null;
}

async function groqBuild(prompt, category) {
  try {
    const sys = 'You are a senior front-end developer. Build a complete, polished, single-folder website. Output ONLY files in this exact format, no explanations:\n###FILE: index.html\n<html code>\n###FILE: style.css\n<css>\n###FILE: app.js\n<js>\nRules: index.html references style.css and app.js relatively. Dark modern theme unless asked otherwise. If the user wants 3D, use Three.js r128 via https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js with mouse interaction and an animation loop guarded by if (!window.THREE) return. Every button, form and control must actually work. No external images.';
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + GROQ_KEY },
      body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Build a ' + category + ' website for: "' + prompt + '"' }], temperature: 0.7, max_tokens: 8000 }),
      signal: AbortSignal.timeout(120000)
    });
    if (!res.ok) return null;
    const j = await res.json();
    return parseFiles(j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content);
  } catch (e) { return null; }
}

// Try Ollama for fully custom code (needs Ollama installed). Returns files map or null.
async function ollamaBuild(prompt, category) {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.JARVIS_MODEL || 'llama3.1:8b',
        prompt: `Build a complete small ${category} website for: "${prompt}". Output ONLY files in this exact format, no explanations:\n###FILE: index.html\n<html code>\n###FILE: style.css\n<css>\n###FILE: app.js\n<js>\nKeep it single-folder, reference style.css and app.js from index.html, dark modern theme.`,
        stream: false
      }),
      signal: AbortSignal.timeout(120000)
    });
    if (!res.ok) return null;
    const { response } = await res.json();
    const files = {};
    const re = /###FILE:\s*([\w.\-]+)\s*\n([\s\S]*?)(?=###FILE:|$)/g;
    let m; while ((m = re.exec(response || ''))) files[m[1].trim()] = m[2].replace(/```\w*/g, '').replace(/```/g, '').trim();
    return (files['index.html']) ? files : null;
  } catch { return null; }
}

async function buildProject({ prompt = '', category = 'landing', files = [], name = '' }) {
  category = (category || 'landing').toLowerCase();
  const known = ['portfolio', 'landing', 'restaurant', 'blog', 'todo'];
  let title = guessTitle(prompt, category);
  let dirName = slug(name || title);
  let dir = path.join(ROOT, dirName);
  let i = 1; while (fs.existsSync(dir)) dir = path.join(ROOT, `${dirName}-${++i}`);
  dirName = path.basename(dir);
  ensureDir(dir);

  // 1. save user files
  const saved = [];
  if (files.length) {
    const ad = ensureDir(path.join(dir, 'assets'));
    for (const f of files.slice(0, 20)) {
      const safe = path.basename(f.name || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      fs.writeFileSync(path.join(ad, safe), Buffer.from(f.content || '', 'base64'));
      saved.push(safe);
    }
  }

  // 2. generate code: Groq AI first, Ollama second, template last resort
  let out = null, viaAI = false;
  out = await groqBuild(prompt, category);
  if (out) viaAI = true;
  else if (!known.includes(category) || /custom|ai|generate/i.test(prompt.slice(0, 60))) {
    out = await ollamaBuild(prompt, category);
    if (out) viaAI = true;
  }
  if (!out) out = template(known.includes(category) ? category : 'landing', title, prompt, saved);

  for (const [fname, content] of Object.entries(out)) {
    ensureDir(path.dirname(path.join(dir, fname)));
    fs.writeFileSync(path.join(dir, fname), content);
  }
  fs.writeFileSync(path.join(dir, 'STEPS.md'),
    `# ${title}\n\nBuilt by Jarvis from: "${prompt}"\n\n${stepsFor(dirName).join('\n')}\n`);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ prompt, category, title }, null, 2));

  return {
    name: dirName, title, path: dir,
    url: `/projects/${dirName}/`,
    files: Object.keys(out).concat(saved.map(s => 'assets/' + s)),
    uploads: saved,
    steps: stepsFor(dirName),
    aiMade: viaAI || undefined
  };
}

function listProjects() {
  if (!fs.existsSync(ROOT)) return [];
  return fs.readdirSync(ROOT).filter(d => fs.statSync(path.join(ROOT, d)).isDirectory());
}

// Rebuild an existing project with a spoken/typed change ("rebuild spicehub with neon theme").
// Keeps uploads, regenerates code from original prompt + change.
async function rebuildProject(name, change) {
  const dir = path.join(ROOT, name);
  if (!fs.existsSync(dir)) {
    // fuzzy match
    const hit = listProjects().find(p => p.includes(name) || name.includes(p));
    if (!hit) throw new Error(`No project "${name}". Say "list projects" to hear them.`);
    return rebuildProject(hit, change);
  }
  let meta = { prompt: '', category: 'landing', title: name };
  try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); } catch {}
  const nm = (change || '').match(/(?:called|renamed? to|named)\s+([\w \-]+)/i);
  const newPrompt = `${meta.prompt}. CHANGE REQUEST: ${change}`;
  const newTitle = nm ? nm[1].trim() : guessTitle(newPrompt, meta.category) === guessTitle(meta.prompt, meta.category) ? meta.title : guessTitle(newPrompt, meta.category);
  const assets = fs.existsSync(path.join(dir, 'assets')) ? fs.readdirSync(path.join(dir, 'assets')) : [];

  let out = await groqBuild(newPrompt, meta.category);
  if (!out) out = await ollamaBuild(newPrompt, meta.category);
  if (!out) out = template(meta.category, newTitle || meta.title, newPrompt, assets);
  for (const [fname, content] of Object.entries(out)) {
    if (fname.startsWith('assets/')) continue;
    fs.writeFileSync(path.join(dir, fname), content);
  }
  meta = { prompt: newPrompt, category: meta.category, title: newTitle || meta.title };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  return { name: path.basename(dir), title: meta.title, path: dir, url: `/projects/${path.basename(dir)}/`, files: Object.keys(out), steps: stepsFor(path.basename(dir)) };
}

module.exports = { buildProject, rebuildProject, listProjects, PROJECTS_DIR: ROOT };
