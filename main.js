// Jarvis server: HUD + API + cmd launcher entry
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleCommand } = require('./core/brain');
const { buildProject, listProjects, PROJECTS_DIR } = require('./core/builder');
const open = require('open');

const PORT = process.env.JARVIS_PORT || 7777;
const UI_DIR = path.join(__dirname, 'ui');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.md': 'text/markdown' };

function readBody(req, limitMB = 25) {
  return new Promise((resolve, reject) => {
    let size = 0; let body = '';
    req.on('data', c => { size += c.length; if (size > limitMB * 1024 * 1024) reject(new Error('Upload too large (25MB max)')); else body += c; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const cleanUrl = req.url.split('?')[0]; // strip ?v= cache-busters etc.

  if (req.url === '/api/command' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { text } = JSON.parse(body || '{}');
        if (!text) { res.writeHead(400); return res.end('{"reply":"Say something, sir."}'); }
        console.log(`> ${text}`);
        const reply = await handleCommand(text);
        console.log(`< ${reply}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply }));
      } catch (e) {
        res.writeHead(500); res.end(JSON.stringify({ reply: 'Error: ' + e.message }));
      }
    });
    return;
  }

  if (req.url === '/api/health') { res.writeHead(200); return res.end('{"ok":true}'); }

  if (req.url === '/api/projects' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ projects: listProjects() }));
  }

  if (req.url === '/api/tasks' && req.method === 'GET') {
    const { listTasks } = require('./core/tasks');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ tasks: listTasks() }));
  }

  if (req.url === '/api/sources' && req.method === 'GET') {    const { getLastResearch } = require('./core/research');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ last: getLastResearch() }));
  }

  if (cleanUrl === '/api/reminders' && req.method === 'GET') {
    const R = require('./core/reminders');
    const peek = req.url.includes('peek=1');
    const due = peek ? [] : R.fireDue();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ reminders: R.listReminders(), due }));
  }

  if (cleanUrl === '/api/reminders' && req.method === 'POST') {
    try {
      const b = JSON.parse(await readBody(req));
      const R = require('./core/reminders');
      const r = R.addReminder(b.text || 'Reminder', b.at || Date.now() + 600000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ reminder: r }));
    } catch (e) {
      res.writeHead(500); return res.end(JSON.stringify({ error: e.message }));
    }
  }

  if (req.url === '/api/system' && req.method === 'GET') {
    const { systemControl } = require('./core/system');
    const { listTasks } = require('./core/tasks');
    const bat = await systemControl('battery');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      battery: bat,
      openTasks: listTasks().filter(t => !t.done).length,
      projects: listProjects().length,
      uptime: Math.floor(process.uptime())
    }));
  }

  if (req.url === '/api/tasks' && req.method === 'POST') {
    try {
      const b = JSON.parse(await readBody(req));
      const T = require('./core/tasks');
      let out = {};
      if (b.action === 'add' && b.text) out = { task: T.addTask(b.text) };
      else if (b.action === 'toggle') out = { task: T.doneTask(b.match) };
      else if (b.action === 'clear') out = { tasks: T.clearDone() };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(500); return res.end(JSON.stringify({ error: e.message }));
    }
  }
  if (req.url === '/api/build' && req.method === 'POST') {
    try {
      const { prompt, category, files, name } = JSON.parse(await readBody(req));
      console.log(`> build [${category}] ${prompt} (+${(files || []).length} files)`);
      const proj = await buildProject({ prompt: prompt || '', category: category || 'landing', files: files || [], name: name || '' });
      console.log(`< built ${proj.name}: ${proj.files.join(', ')}`);
      try { await open(`http://localhost:${server.address().port}${proj.url}`); } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(proj));
    } catch (e) {
      res.writeHead(500); return res.end(JSON.stringify({ error: e.message }));
    }
  }

  if (req.url === '/api/rebuild' && req.method === 'POST') {
    try {
      const { name, change } = JSON.parse(await readBody(req));
      const { rebuildProject } = require('./core/builder');
      const proj = await rebuildProject(name, change);
      try { await open(`http://localhost:${server.address().port}${proj.url}`); } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(proj));
    } catch (e) {
      res.writeHead(500); return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // ---- NEW FEATURES ----

  // Weather
  if (cleanUrl.startsWith('/api/weather')) {
    const { getWeather, formatWeather } = require('./core/weather');
    const q = new URL(req.url, 'http://localhost').searchParams.get('q') || 'Delhi';
    try {
      const w = await getWeather(q);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ weather: w, text: formatWeather(w) }));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: e.message })); }
  }

  // News
  if (cleanUrl.startsWith('/api/news')) {
    const { getNews, formatNews } = require('./core/news');
    const q = new URL(req.url, 'http://localhost').searchParams.get('q') || '';
    try {
      const items = await getNews(q);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ news: items, text: formatNews(items, q) }));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: e.message })); }
  }

  // Music control
  if (cleanUrl === '/api/music' && req.method === 'POST') {
    const { spotifyControl, browserMedia } = require('./core/music');
    try {
      const { action, target } = JSON.parse(await readBody(req));
      const result = (target === 'spotify' ? spotifyControl : browserMedia)(action || 'toggle');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ result }));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: e.message })); }
  }

  // Notes
  if (cleanUrl === '/api/notes' && req.method === 'GET') {
    const N = require('./core/notes');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ notes: N.listNotes(), text: N.formatNotes(N.listNotes()) }));
  }
  if (cleanUrl === '/api/notes' && req.method === 'POST') {
    const N = require('./core/notes');
    try {
      const b = JSON.parse(await readBody(req));
      let result;
      if (b.action === 'add') result = N.addNote(b.text);
      else if (b.action === 'delete') { N.deleteNote(b.id); result = { deleted: b.id }; }
      else if (b.action === 'search') result = N.searchNotes(b.query);
      else result = N.listNotes();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ result }));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: e.message })); }
  }

  // Clipboard
  if (cleanUrl === '/api/clipboard' && req.method === 'GET') {
    const C = require('./core/clipboard');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ history: C.getHistory(), text: C.formatHistory(C.getHistory()) }));
  }
  if (cleanUrl === '/api/clipboard' && req.method === 'POST') {
    const C = require('./core/clipboard');
    try {
      const b = JSON.parse(await readBody(req));
      if (b.action === 'copy') { C.setClipboard(b.text); return res.end(JSON.stringify({ result: 'Copied to clipboard.' })); }
      if (b.action === 'clear') return res.end(JSON.stringify({ result: C.clearHistory() }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ history: C.getHistory() }));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: e.message })); }
  }

  // Screenshot
  if (cleanUrl === '/api/screenshot' && req.method === 'POST') {
    const S = require('./core/screenshot');
    try {
      const b = JSON.parse(await readBody(req));
      const result = S.takeScreenshot(b.region);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: e.message })); }
  }

  // Calculator
  if (cleanUrl === '/api/calc' && req.method === 'POST') {
    const { calculate } = require('./core/calculator');
    try {
      const { expr } = JSON.parse(await readBody(req));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ result: calculate(expr || '') }));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: e.message })); }
  }

  // Timer
  if (cleanUrl === '/api/timer' && req.method === 'POST') {
    const T = require('./core/timer');
    try {
      const b = JSON.parse(await readBody(req));
      let result;
      if (b.action === 'start') result = T.startTimer(b.name, b.seconds);
      else if (b.action === 'stopwatch') result = T.startStopwatch(b.name);
      else if (b.action === 'status') result = T.getStopwatch(b.id);
      else if (b.action === 'list') result = T.listTimers();
      else if (b.action === 'cancel') result = T.cancelTimer(b.id);
      else result = T.listTimers();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ result }));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: e.message })); }
  }

  // System monitor
  if (cleanUrl === '/api/sysmonitor' && req.method === 'GET') {
    const { execSync } = require('child_process');
    try {
      const cpu = execSync('powershell -NoProfile -Command "(Get-Counter \'\\Processor(_Total)\\% Processor Time\').CounterSamples[0].CookedValue"', { encoding: 'utf8', windowsHide: true, timeout: 5000 }).trim();
      const mem = execSync('powershell -NoProfile -Command "$m=Get-CimInstance Win32_OperatingSystem;[math]::Round(($m.TotalVisibleMemorySize-$m.FreePhysicalMemory)/$m.TotalVisibleMemorySize*100,1)"', { encoding: 'utf8', windowsHide: true, timeout: 5000 }).trim();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ cpu: parseFloat(cpu) || 0, mem: parseFloat(mem) || 0 }));
    } catch (e) { res.writeHead(500); return res.end(JSON.stringify({ error: e.message })); }
  }

  // static project previews
  if (cleanUrl.startsWith('/projects/')) {
    let rel = decodeURIComponent(cleanUrl.slice('/projects/'.length)).replace(/\.\./g, '');
    if (rel.endsWith('/')) rel += 'index.html';
    const fp = path.join(PROJECTS_DIR, rel);
    if (fp.startsWith(PROJECTS_DIR) && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'text/plain', 'Cache-Control': 'no-store' });
      return fs.createReadStream(fp).pipe(res);
    }
    res.writeHead(404); return res.end('project file not found');
  }

  // static UI
  let file = cleanUrl === '/' ? '/index.html' : cleanUrl;
  const fp = path.join(UI_DIR, decodeURIComponent(file).replace(/\.\./g, ''));
  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain', 'Cache-Control': 'no-store' });
    return fs.createReadStream(fp).pipe(res);
  }
  res.writeHead(404); res.end('not found');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    const next = Number(PORT) + 1;
    console.log(`Port ${PORT} busy (old Jarvis still running) — trying ${next}...`);
    server.listen(next);
  } else throw e;
});

server.listen(PORT, async () => {
  const live = server.address().port;
  process.env.JARVIS_LIVE_PORT = String(live);
  console.log(`\n  J.A.R.V.I.S online at http://localhost:${live}\n  Type commands in HUD or send POST /api/command {"text":"open notepad"}\n`);
  if (!process.argv.includes('--no-open') && !process.env.JARVIS_EMBED) {
    try { await open(`http://localhost:${live}`); } catch {}
  }
});
