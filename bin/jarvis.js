#!/usr/bin/env node
// `jarvis` command entry:
//   jarvis            -> server in this window + browser HUD
//   jarvis app        -> server hidden (if needed) + standalone APP window (no browser UI)
//   jarvis "command"  -> one-shot command
const path = require('path');
const { spawn, execFile } = require('child_process');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);

async function liveBase() {
  for (const p of [7777, 7778, 7779]) {
    try {
      const r = await fetch(`http://localhost:${p}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return `http://localhost:${p}`;
    } catch {}
  }
  return null;
}
function ensureServer() {
  return new Promise((resolve) => {
    spawn('node', [path.join(root, 'main.js'), '--no-open'], {
      cwd: root, detached: true, stdio: 'ignore', shell: false, windowsHide: true
    }).unref();
    // wait for health
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      if (await liveBase()) { clearInterval(t); resolve(true); }
      else if (tries > 20) { clearInterval(t); resolve(false); }
    }, 500);
  });
}
function findChrome() {
  const fs = require('fs');
  const cands = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ((process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe'),
    ((process.env.PROGRAMFILES || '') + '\\Google\\Chrome\\Application\\chrome.exe')
  ].filter(Boolean);
  return cands.find(p => { try { return fs.existsSync(p); } catch { return false; } }) || null;
}
function appWindow(url) {
  const chrome = findChrome();
  if (!chrome) { console.error('launch-failed: Chrome not found. Set CHROME_PATH or install Chrome/Edge.'); process.exit(1); }
  const child = spawn(chrome, [`--app=${url}`, '--window-size=1440,900'], { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', (e) => { console.error('launch-failed: ' + e.message); process.exit(1); });
  child.unref();
  setTimeout(() => process.exit(0), 1200).unref();
}

if (args.length === 0) {
  // launch full HUD
  spawn('node', [path.join(root, 'main.js')], { stdio: 'inherit', cwd: root, shell: true });
} else if (args[0].toLowerCase() === 'app') {
  (async () => {
    let base = await liveBase();
    if (!base) {
      console.log('Starting Jarvis core…');
      await ensureServer();
      base = await liveBase();
    }
    if (!base) { console.log('Could not start server.'); process.exit(1); }
    console.log(`Opening Jarvis app at ${base} (standalone window, no browser).`);
    appWindow(base);
    setTimeout(() => process.exit(0), 1500).unref();
  })();
} else {
  // one-shot: jarvis "day report" -> POST to running server or direct handle
  const text = args.join(' ');
  (async () => {
    try {
      const r = await fetch('http://localhost:7777/api/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const { reply } = await r.json();
      console.log('JARVIS:', reply);
    } catch {
      // server not running -> handle directly
      const { handleCommand } = require(path.join(root, 'core', 'brain.js'));
      console.log('JARVIS:', await handleCommand(text));
    }
  })();
}
