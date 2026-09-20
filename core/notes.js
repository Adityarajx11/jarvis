// Quick notes — save/load/list/search notes from data/notes.json
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'notes.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}

function save(notes) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(notes, null, 2));
}

function addNote(text) {
  const notes = load();
  const note = { id: notes.length ? Math.max(...notes.map(n => n.id)) + 1 : 1, text: text.trim(), created: Date.now() };
  notes.push(note);
  save(notes);
  return note;
}

function listNotes() { return load(); }

function getNote(id) { return load().find(n => n.id === Number(id)); }

function deleteNote(id) {
  const notes = load().filter(n => n.id !== Number(id));
  save(notes);
  return notes;
}

function searchNotes(query) {
  const q = query.toLowerCase();
  return load().filter(n => n.text.toLowerCase().includes(q));
}

function formatNotes(notes) {
  if (!notes.length) return 'No notes saved yet.';
  return notes.map(n => {
    const d = new Date(n.created);
    const ts = d.toLocaleDateString('en', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    return `${n.id}. ${n.text} — ${ts}`;
  }).join('\n');
}

module.exports = { addNote, listNotes, getNote, deleteNote, searchNotes, formatNotes };
