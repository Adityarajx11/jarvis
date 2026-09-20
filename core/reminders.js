// Jarvis Reminders: "remind me to X in 10 minutes / at 6pm / tomorrow". HUD polls and speaks.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DIR, 'reminders.json');

function load() {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return []; }
}
function save(r) { fs.writeFileSync(FILE, JSON.stringify(r, null, 2)); }

// returns { at: epoch|null, clean: text-without-time-phrase }
function parseWhen(s) {
  let clean = s, at = null;
  const now = new Date();
  let m = clean.match(/\bin (\d+)\s*(seconds?|minutes?|hours?)/i);
  if (m) {
    const n = parseInt(m[1]);
    const ms = /second/i.test(m[2]) ? n * 1000 : /minute/i.test(m[2]) ? n * 60000 : n * 3600000;
    at = Date.now() + ms;
    clean = clean.replace(m[0], '');
  } else if ((m = clean.match(/\b(tomorrow\s+)?at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i))) {
    let h = parseInt(m[2]); const min = parseInt(m[3] || '0');
    const ap = (m[4] || '').toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    const d = new Date(now);
    d.setHours(h, min, 0, 0);
    if (/tomorrow/i.test(m[1] || '') && d <= now) d.setDate(d.getDate() + 1);
    if (!/tomorrow/i.test(m[1] || '') && d <= now) d.setDate(d.getDate() + 1); // next occurrence
    at = d.getTime();
    clean = clean.replace(m[0], '').replace(/\btomorrow\b/i, '');
  } else if (/\btomorrow morning\b/i.test(clean)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    at = d.getTime(); clean = clean.replace(/tomorrow morning/i, '');
  } else if (/\btonight\b/i.test(clean)) {
    const d = new Date(now); d.setHours(21, 0, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    at = d.getTime(); clean = clean.replace(/tonight/i, '');
  } else if (/\btomorrow\b/i.test(clean)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    at = d.getTime(); clean = clean.replace(/tomorrow/i, '');
  }
  clean = clean.replace(/\s+/g, ' ').replace(/^(to|that|for|please)\s+/i, '').trim();
  return { at, clean };
}

function addReminder(text, at) {
  const all = load();
  const r = { id: (all.reduce((m, x) => Math.max(m, x.id || 0), 0)) + 1, text: text.trim(), at, fired: false, created: new Date().toISOString() };
  all.push(r); save(all);
  return r;
}
function fireDue() {
  const all = load();
  const now = Date.now();
  const due = all.filter(r => !r.fired && r.at && r.at <= now);
  if (due.length) { due.forEach(r => r.fired = true); save(all); }
  return due;
}
function listReminders() { return load().sort((a, b) => (a.at || 9e15) - (b.at || 9e15)); }
function fmtTime(at) { return new Date(at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }

module.exports = { parseWhen, addReminder, fireDue, listReminders, fmtTime };
