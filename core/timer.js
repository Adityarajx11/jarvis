// Timer / Stopwatch — in-memory timers with voice announcements
const timers = new Map();
let nextId = 1;

function startTimer(name, seconds) {
  const id = nextId++;
  const endAt = Date.now() + seconds * 1000;
  timers.set(id, { name: name || `Timer ${id}`, endAt, seconds, done: false });
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return { id, name: name || `Timer ${id}`, duration: `${mins > 0 ? mins + 'm ' : ''}${secs}s`, endAt };
}

function checkTimers() {
  const now = Date.now();
  const fired = [];
  for (const [id, t] of timers) {
    if (!t.done && now >= t.endAt) {
      t.done = true;
      fired.push({ id, name: t.name, message: `Hey, your ${t.name} just finished!` });
    }
  }
  return fired;
}

function listTimers() {
  const now = Date.now();
  const active = [];
  for (const [id, t] of timers) {
    if (!t.done) {
      const remaining = Math.max(0, Math.ceil((t.endAt - now) / 1000));
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      active.push({ id, name: t.name, remaining: `${mins > 0 ? mins + 'm ' : ''}${secs}s` });
    }
  }
  return active;
}

function cancelTimer(id) {
  if (timers.has(id)) {
    timers.delete(id);
    return true;
  }
  return false;
}

function startStopwatch(name) {
  const id = nextId++;
  timers.set(id, { name: name || 'Stopwatch', startAt: Date.now(), type: 'stopwatch', done: false });
  return { id, name: name || 'Stopwatch', started: new Date().toLocaleTimeString('en') };
}

function getStopwatch(id) {
  const t = timers.get(id);
  if (!t || t.type !== 'stopwatch') return null;
  const elapsed = Math.floor((Date.now() - t.startAt) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return { id: t.id, name: t.name, elapsed: `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`, totalSeconds: elapsed };
}

module.exports = { startTimer, checkTimers, listTimers, cancelTimer, startStopwatch, getStopwatch };
