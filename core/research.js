// Jarvis Deep Research: full search on a topic through everything Jarvis can
// reach — local projects + web — with automatic source citations.
const fs = require('fs');
const path = require('path');

const PROJECTS = path.join(__dirname, '..', 'projects');
const DATA = path.join(__dirname, '..', 'data');
const LAST_FILE = path.join(DATA, 'last_research.json');

function saveLast(topic, summary, sources) {
  try {
    if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
    fs.writeFileSync(LAST_FILE, JSON.stringify({ topic, summary: (summary || '').slice(0, 400), sources, time: new Date().toISOString() }, null, 2));
  } catch {}
}
function getLastResearch() {
  try { return JSON.parse(fs.readFileSync(LAST_FILE, 'utf8')); } catch { return null; }
}

function keywords(topic) {
  return topic.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
}

// search local projects: names, meta prompts, and text content (capped)
function searchLocal(topic) {
  const hits = [];
  try {
    if (!fs.existsSync(PROJECTS)) return hits;
    const kws = keywords(topic);
    for (const dir of fs.readdirSync(PROJECTS)) {
      const full = path.join(PROJECTS, dir);
      if (!fs.statSync(full).isDirectory()) continue;
      if (kws.some(k => dir.toLowerCase().includes(k))) { hits.push({ file: `projects/${dir}/`, why: 'project name match' }); continue; }
      let meta = '';
      try { meta = fs.readFileSync(path.join(full, 'meta.json'), 'utf8'); } catch {}
      if (meta && kws.some(k => meta.toLowerCase().includes(k))) { hits.push({ file: `projects/${dir}/meta.json`, why: 'project description match' }); continue; }
      // content grep, text files only, cap
      const walk = (d, depth) => {
        if (hits.length >= 6 || depth > 2) return;
        for (const f of fs.readdirSync(d)) {
          if (hits.length >= 6) break;
          const fp = path.join(d, f);
          try {
            if (fs.statSync(fp).isDirectory()) { if (f !== 'assets' && f !== 'node_modules') walk(fp, depth + 1); }
            else if (/\.(html|css|js|md|txt|json)$/i.test(f) && fs.statSync(fp).size < 100 * 1024) {
              const c = fs.readFileSync(fp, 'utf8').toLowerCase();
              if (kws.some(k => c.includes(k))) hits.push({ file: path.relative(path.join(__dirname, '..'), fp).replace(/\\/g, '/'), why: 'content match' });
            }
          } catch {}
        }
      };
      walk(full, 0);
    }
  } catch {}
  return hits.slice(0, 6);
}

async function searchWeb(topic) {
  const out = { summary: '', url: '', related: [] };
  try {
    const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1&skip_disambig=1`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    out.summary = (d.AbstractText || d.Answer || '').trim();
    out.url = d.AbstractURL || '';
    out.related = (d.RelatedTopics || []).slice(0, 3).map(t => t.Text || '').filter(Boolean);
  } catch {}
  if (!out.summary) {
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.replace(/\s+/g, '_'))}`, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d = await r.json();
        if (d.extract) { out.summary = d.extract.slice(0, 600); out.url = (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || ''; }
      }
    } catch {}
  }
  return out;
}

async function deepResearch(topic) {
  const { searchFiles } = require('./filesearch');
  const [projHits, fileHits, web] = await Promise.all([
    Promise.resolve(searchLocal(topic)),
    Promise.resolve(searchFiles(topic, 5)),
    searchWeb(topic)
  ]);
  const seen = new Set(projHits.map(h => h.file.toLowerCase()));
  const local = [...projHits, ...fileHits.filter(h => !seen.has(h.file.toLowerCase()))].slice(0, 8);
  let s = `Deep research on "${topic}".\n`;
  s += web.summary ? `\nOVERVIEW: ${web.summary.slice(0, 500)}` : '\nOVERVIEW: no web summary found.';
  if (web.related.length) s += `\nRELATED: ${web.related.join(' | ').slice(0, 300)}`;
  s += local.length ? `\nYOUR STUFF (${local.length} local hits): ` + local.map(h => `${h.file} (${h.why})`).join(' | ')
    : '\nYOUR STUFF: nothing matching in your projects.';
  s += '\nSOURCES: ' + [
    web.url ? `web: ${web.url}` : 'web: duckduckgo/wikipedia (no direct page)',
    ...local.map(h => 'local: ' + (h.file.includes(':\\') ? h.file : 'F:\\jarvis\\' + h.file))
  ].join(' | ');
  saveLast(topic, web.summary, [
    ...(web.url ? [{ label: 'Web overview', url: web.url }] : [{ label: 'Web: DuckDuckGo/Wikipedia' }]),
    ...local.map(h => ({ label: `Local: ${h.file}`, local: h.file }))
  ]);
  return s;
}

module.exports = { deepResearch, getLastResearch };
