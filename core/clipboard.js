// Clipboard manager — history of copied text (polls clipboard every 2s)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FILE = path.join(__dirname, '..', 'data', 'clipboard.json');
const MAX = 50;

function getClipboard() {
  try {
    return execSync('powershell -NoProfile -Command "[System.Windows.Forms.Clipboard]::GetText()"', { encoding: 'utf8', windowsHide: true, timeout: 3000 }).trim();
  } catch { return ''; }
}

function setClipboard(text) {
  try {
    const escaped = text.replace(/"/g, '""');
    execSync(`powershell -NoProfile -Command "[System.Windows.Forms.Clipboard]::SetText('${escaped}')'"`, { windowsHide: true, timeout: 3000 });
  } catch {}
}

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}

function save(history) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(history, null, 2));
}

let lastClip = '';

function pollClipboard() {
  const current = getClipboard();
  if (current && current !== lastClip && current.length > 0 && current.length < 5000) {
    lastClip = current;
    const history = load();
    // Don't duplicate the last entry
    if (history.length === 0 || history[0].text !== current) {
      history.unshift({ text: current, time: Date.now() });
      if (history.length > MAX) history.pop();
      save(history);
    }
  }
}

function getHistory() { return load(); }

function clearHistory() { save([]); return 'Clipboard history cleared.'; }

function formatHistory(items) {
  if (!items.length) return 'Clipboard is empty right now.';
  return items.slice(0, 10).map((c, i) => {
    const ts = new Date(c.time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    const preview = c.text.length > 80 ? c.text.slice(0, 80) + '…' : c.text;
    return `${i + 1}. [${ts}] ${preview.replace(/\n/g, ' ')}`;
  }).join('\n');
}

module.exports = { getClipboard, setClipboard, pollClipboard, getHistory, clearHistory, formatHistory };
