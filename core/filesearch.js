// Jarvis Deep File Search: indexed folders, filename + content grep.
// Feeds research ("your stuff") and direct "search files for X".
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.join(__dirname, '..', 'data');
const IDX = path.join(DIR, 'file-index.json');

const SKIP = new Set(['node_modules', '.git', '.venv', '__pycache__', '.cache', 'AppData', '.ollama', 'dist']);
const TEXT = new Set(['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.py', '.java', '.c', '.cpp', '.cs', '.log', '.csv', '.xml', '.yml', '.yaml', '.ini', '.cfg', '.bat', '.ps1', '.java']);

function defaults() {
  const home = os.homedir();
  return [
    path.join(home, 'Documents'),
    path.join(home, 'OneDrive', 'Documents'),
    path.join(home, 'Desktop'),
    path.join(home, 'OneDrive', 'Desktop'),
    path.join(__dirname, '..', 'projects'),
    path.join(__dirname, '..')
  ].filter(d => { try { return fs.statSync(d).isDirectory(); } catch { return false; } });
}
function getDirs() {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    if (fs.existsSync(IDX)) {
      const ds = JSON.parse(fs.readFileSync(IDX, 'utf8')).dirs || [];
      const live = ds.filter(d => { try { return fs.statSync(d).isDirectory(); } catch { return false; } });
      if (live.length) return live;
    }
  } catch {}
  return defaults();
}
function addDir(p) {
  const full = path.resolve(p.replace(/^["']|["']$/g, ''));
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) throw new Error(`Folder not found: ${p}`);
  const dirs = getDirs();
  if (!dirs.some(d => d.toLowerCase() === full.toLowerCase())) {
    dirs.push(full);
    fs.writeFileSync(IDX, JSON.stringify({ dirs }, null, 2));
  }
  return full;
}

function searchFiles(query, maxHits = 12, maxMs = 6000) {
  const kws = query.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
  if (!kws.length) return [];
  const hits = [];
  const deadline = Date.now() + maxMs;
  const walk = (d, depth) => {
    if (hits.length >= maxHits || Date.now() > deadline || depth > 4) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (hits.length >= maxHits || Date.now() > deadline) break;
      if (e.name.startsWith('.') && e.name !== '.env') continue;
      if (SKIP.has(e.name)) continue;
      const fp = path.join(d, e.name);
      try {
        if (e.isDirectory()) walk(fp, depth + 1);
        else {
          const low = e.name.toLowerCase();
          if (kws.some(k => low.includes(k))) {
            hits.push({ file: fp, why: 'filename match' });
            continue;
          }
          if (TEXT.has(path.extname(low)) && fs.statSync(fp).size < 200 * 1024) {
            const content = fs.readFileSync(fp, 'utf8');
            const lines = content.split('\n');
            const li = lines.findIndex(l => { const ll = l.toLowerCase(); return kws.some(k => ll.includes(k)); });
            if (li >= 0) hits.push({ file: fp, why: `content match (line ${li + 1})`, snippet: lines[li].trim().slice(0, 140) });
          }
        }
      } catch {}
    }
  };
  for (const dir of getDirs()) walk(dir, 0);
  return hits;
}

module.exports = { getDirs, addDir, searchFiles };
