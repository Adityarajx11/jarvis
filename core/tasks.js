// Jarvis Tasks: persistent voice-driven todo list.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DIR, 'tasks.json');

function load() {
  try {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { return []; }
}
function save(tasks) { fs.writeFileSync(FILE, JSON.stringify(tasks, null, 2)); }

function addTask(text) {
  const tasks = load();
  const t = { id: (tasks.reduce((m, x) => Math.max(m, x.id || 0), 0)) + 1, text: text.trim(), done: false, created: new Date().toISOString() };
  tasks.push(t); save(tasks);
  return t;
}
function listTasks() { return load(); }
function doneTask(match) {
  const tasks = load();
  const m = String(match).toLowerCase().trim();
  let hit = /^\d+$/.test(m) ? tasks.find(t => t.id === Number(m)) : tasks.find(t => !t.done && t.text.toLowerCase().includes(m));
  if (!hit) hit = tasks.find(t => t.text.toLowerCase().includes(m));
  if (!hit) return null;
  hit.done = true; save(tasks);
  return hit;
}
function clearDone() {
  const tasks = load().filter(t => !t.done);
  save(tasks);
  return tasks;
}
function formatTasks() {
  const tasks = load();
  if (!tasks.length) return 'No tasks. Say "add task buy milk" to start.';
  const open = tasks.filter(t => !t.done), done = tasks.filter(t => t.done);
  let s = open.length ? `Open (${open.length}): ` + open.map(t => `${t.id}. ${t.text}`).join(' | ')
    : 'All clear. Nothing open.';
  if (done.length) s += ` Done: ${done.map(t => t.text).join(', ')}.`;
  return s;
}

module.exports = { addTask, listTasks, doneTask, clearDone, formatTasks };
