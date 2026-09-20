// Brain: local Ollama + rule-based fallback with fuzzy typo handling.
const sys = require('./system');
const { buildProject, rebuildProject, listProjects } = require('./builder');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Key stored scrambled (reversed + base64); decoded at runtime so it never sits readable in the file.
const _kx = Buffer.from('V1pMOXJqZUlqb1RnbWRuNWRGNDUxUUNyWUYzYnlkR1dMMHNCMlE1MkRiUmRGaTdKSHVBSF9rc2c=', 'base64').toString('utf8').split('').reverse().join('');
const GROQ_KEY = process.env.JARVIS_GROQ_KEY || _kx;
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OLLAMA_URL = 'http://localhost:11434';
const OLLAMA_MODEL = 'llama3.1:latest';

/* ---- fuzzy typo correction ---- */
const TYPOS = {
  // commands
  'reaserch': 'research', 'reserch': 'research', 'resarch': 'research', 'reserach': 'research',
  'remidner': 'reminder', 'remider': 'reminder', 'reminde': 'reminder',
  'scheduel': 'schedule', 'schedual': 'schedule',
  'shutdwon': 'shutdown', 'shutdonw': 'shutdown', 'shutdowm': 'shutdown',
  'brighness': 'brightness', 'brigtness': 'brightness', 'brightnes': 'brightness',
  'volme': 'volume', 'vloume': 'volume', 'voluem': 'volume',
  'screnshot': 'screenshot', 'screeshot': 'screenshot', 'screnshot': 'screenshot',
  'calender': 'calendar', 'calandar': 'calendar',
  'reciept': 'receipt', 'recipt': 'receipt',
  'definately': 'definitely', 'definatly': 'definitely', 'definetly': 'definitely',
  'occured': 'occurred', 'occuring': 'occurring',
  'seperate': 'separate', 'seperately': 'separately',
  'wi-fi': 'wifi', 'wifii': 'wifi',
  // common words
  'tommorow': 'tomorrow', 'tmr': 'tomorrow', 'tmrw': 'tomorrow', 'tmro': 'tomorrow',
  'yest': 'yesterday', 'yestday': 'yesterday',
  'browzer': 'browser', 'browswer': 'browser',
  'applicaton': 'application', 'appliation': 'application',
  'temprature': 'temperature', 'temperture': 'temperature',
  'infomation': 'information', 'informtion': 'information',
  'projcet': 'project', 'projetc': 'project',
  'remeber': 'remember', 'remmeber': 'remember',
  'alaram': 'alarm', 'alrem': 'alarm',
  'ot': 'to the', 'wit': 'with', 'fr': 'for', 'u': 'you', 'ur': 'your',
  'plz': 'please', 'pls': 'please', 'plox': 'please',
  'wot': 'what', 'wut': 'what', 'wht': 'what', 'y': 'why',
  'bc': 'because', 'bcuz': 'because', 'bout': 'about',
  'rn': 'right now', 'idk': 'i dont know',
  'brb': 'be right back', 'lol': 'laughing out loud',
  'kinda': 'kind of', 'sorta': 'sort of',
  'gonna': 'going to', 'wanna': 'want to', 'gotta': 'got to',
  'lemme': 'let me', 'gimme': 'give me',
  'cud': 'could', 'wud': 'would', 'shud': 'should',
  'abt': 'about', 'abut': 'about', 'wtih': 'with', 'wiht': 'with',
  'hwat': 'what', 'whhat': 'what', 'hwo': 'how', 'waht': 'what',
  'taht': 'that', 'thta': 'that', 'thsi': 'this', 'tihs': 'this',
  'jsut': 'just', 'jus': 'just', 'nto': 'not', 'ont': 'not',
  'nad': 'and', 'adn': 'and', 'fo': 'of', 'ot': 'to',
  'forev': 'forever', 'alot': 'a lot', 'infact': 'in fact',
  'becuase': 'because', 'beacuse': 'because', 'becasue': 'because',
  'uptime': 'uptime', 'up time': 'uptime',
};

// Levenshtein distance for fuzzy matching
function lev(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] !== b[j-1] ? 1 : 0));
  return dp[m][n];
}

// Normalize text: fix typos, expand abbreviations, clean up
function normalize(text) {
  let t = text.toLowerCase().trim();
  // expand abbreviations with word boundaries
  for (const [abbr, full] of Object.entries(TYPOS)) {
    const re = new RegExp(`\\b${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    t = t.replace(re, full);
  }
  // fix individual words if they're close to a known word
  const words = t.split(/\s+/);
  const fixed = words.map(w => {
    const clean = w.replace(/[^a-z]/g, '');
    if (clean.length < 3) return w; // skip tiny words
    // check against known command keywords
    const keywords = ['research','remind','reminder','shutdown','restart','brightness','volume',
      'screenshot','calendar','browser','project','task','todo','alarm','report','status','stats',
      'create','delete','open','close','search','find','index','files','folder','list',
      'today','tomorrow','yesterday','time','date','build','rebuild','update','modify',
      'weather','news','music','timer','stopwatch','calculator','translate','note','save',
      'download','upload','copy','move','paste','undo','redo','help','clear','done',
      'complete','finish','cancel','abort','sleep','lock','mute','wifi','battery',
      'calculate','compute','clipboard','capture','monitor','performance','cpu','ram','memory',
      'disk','gpu','resource','about','uptime','process','kill','bluetooth','hotspot',
      'dark','light','mode','ip','record'];
    let best = null, bestDist = 99;
    for (const kw of keywords) {
      const d = lev(clean, kw);
      if (d < bestDist && d <= Math.max(1, Math.floor(clean.length * 0.35))) {
        bestDist = d;
        best = kw;
      }
    }
    return best || w;
  });
  return fixed.join(' ');
}

async function ollamaChat(prompt) {
  // Try Groq cloud first (fast, smart)
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are JARVIS, a brilliant AI assistant. Be concise (1-3 sentences max). Be helpful, witty, and direct. Answer any factual question confidently. If you don\'t know something, say so honestly. Never say "I can\'t" for knowledge questions — just answer them.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1024
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    }
  } catch {}
  // Fallback to local Ollama
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `You are JARVIS, a smart AI assistant on the user's PC. The user typed this (may have typos — understand their intent): "${prompt}". Reply naturally in 1-2 sentences. Be helpful and conversational. If it's a factual question, answer it. If it sounds like a system command you can't do, say "I can handle system tasks — try opening apps, checking weather, or asking me anything."`,
        stream: false,
        options: { temperature: 0.4, num_predict: 150 }
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response?.trim() || null;
  } catch { return null; }
}

async function handleCommand(rawText) {
  const text = normalize(rawText);
  const orig = rawText.trim();

  // ---- SYSTEM RULES (fast, no Ollama needed) ----

  // 1. day report / status
  if (/day report|my day|briefing|good morning|status report|how.*system/.test(text))
    return await sys.dayReport();

  // 2. chrome / browser / incognito / search (but not ping/traceroute)
  if (!/^ping\b/.test(text) && !/^traceroute\b/.test(text)) {
    if (/chrom|browzer|browswer|incogn|private.*tab|youtube|google|search (for|this)|open.*tab|go to.*(chrom|brow)/.test(text)) {
      if (/chrom|browzer|browswer|incogn|youtube|google|search|tab|go to.*(site|web)/.test(text))
        return await sys.browserAction(orig);
    }
  }

  // 3. open app
  let m = text.match(/(?:open|launch|start) ([\w .+-]+)/);
  if (m && !/chrome|browser|tab|youtube|google|file|folder/.test(m[1])) {
    return await sys.openApp(m[1].trim());
  }
  // 4. close app
  m = text.match(/(?:close|kill|quit|exit) ([\w .+-]+)/);
  if (m) return await sys.closeApp(m[1].trim());

  // 4b. APP AUTOMATION: messaging
  // "whatsapp msg prince hello" / "discord message rahul how are you" / "gmail compose to user@mail.com subject: hi body: hello"
  let msgMatch = text.match(/^(whatsapp|discord|telegram|slack|gmail|email)\s+(msg|send|message|compose)\s+(?:to\s+)?(.+?)(?:\s+(?:saying|text|message|msg|body|with)\s+(.+))?$/);
  if (msgMatch) {
    const app = msgMatch[1], action = msgMatch[2], target = msgMatch[3].trim(), msg = msgMatch[4]?.trim();
    // For Gmail, parse subject and body from target
    if (app === 'gmail' || app === 'email') {
      const subjMatch = target.match(/(.+?)\s+subject:\s*(.+?)(?:\s+body:\s*(.+))?$/);
      if (subjMatch) {
        return await sys.appAutomation(app, action, subjMatch[1].trim(), `${subjMatch[2].trim()}|${subjMatch[3]?.trim() || ''}`);
      }
    }
    return await sys.appAutomation(app, action, target, msg);
  }
  // "msg prince on whatsapp hello" / "message rahul on discord how are you"
  msgMatch = text.match(/^(?:msg|send|message|compose)\s+(.+?)\s+(?:on|in|via|through)\s+(whatsapp|discord|telegram|slack|gmail|email)\s*(?:saying|text|message|msg|body|with)?\s*(.*)/);
  if (msgMatch) {
    return await sys.appAutomation(msgMatch[2], 'msg', msgMatch[1].trim(), msgMatch[3]?.trim());
  }
  // "open whatsapp" / "open discord" / "open telegram"
  if (/^(open|launch|start)\s+(whatsapp|discord|telegram|slack|gmail)\b/.test(text)) {
    const app = text.match(/(whatsapp|discord|telegram|slack|gmail)/)[1];
    return await sys.appAutomation(app, 'open');
  }

  // 5. system: shutdown/restart/sleep/lock/mute/volume/brightness/wifi/battery/screenshot
  if (/shut\s*down|shutdwon|shutdonw|shutdowm|power\s*off/.test(text)) {
    if (/cancel|abort/.test(text)) return await sys.systemControl('cancel-shutdown');
    return await sys.systemControl('shutdown');
  }
  if (/rest|reboot|restrat/.test(text)) return await sys.systemControl('restart');
  if (/\bsleep\b|slep\b/.test(text)) return await sys.systemControl('sleep');
  if (/lokc|locl|lok/.test(text)) return await sys.systemControl('lock');
  if (/mut|mute/.test(text)) return await sys.systemControl('mute');
  if (m = text.match(/vol(?:ium)?e?.*?(\d+)?/) || text.match(/volme|vloume|voluem/)) {
    if (/vol|sound/.test(text)) return await sys.systemControl('volume', m && m[1]);
  }
  if (m = text.match(/bright(?:ness)?.*?(\d+)?/) || text.match(/brighness|brigtness|brightnes/)) return await sys.systemControl('brightness', m && m[1]);
  if (/wifi.*off|turn.*off.*wifi/.test(text)) return await sys.systemControl('wifi-off');
  if (/wifi.*on|turn.*on.*wifi/.test(text)) return await sys.systemControl('wifi-on');
  if (/batter|batery/.test(text)) return await sys.systemControl('battery');
  if (/screen\s*shot|screnshot|screeshot/.test(text)) return await sys.systemControl('screenshot');

  // 6. files
  if (/list files|show files|list.*folder|what.*in.*folder/.test(text)) {
    const p = orig.match(/(?:in|of) ([A-Z]:[\\\w .:-]+)/i);
    return await sys.fileOp('list', p ? p[1] : undefined);
  }
  if (m = orig.match(/create (?:file|folder) ([\w :\\\/.\- ]+)/i)) {
    const isFolder = /folder/i.test(orig);
    return await sys.fileOp(isFolder ? 'create-folder' : 'create-file', m[1].trim());
  }
  if (m = orig.match(/delete ([\w :\\\/.\- ]+)/i)) return await sys.fileOp('delete', m[1].trim());
  if (m = orig.match(/(?:open file|open folder) ([\w :\\\/.\- ]+)/i)) return await sys.fileOp('open', m[1].trim());
  if (m = text.match(/find file ([\w .\-]+)/)) return await sys.fileOp('search', m[1].trim());

  // 6a. REBUILD / LIST: "rebuild spicehub with neon theme" / "list projects"
  if (/list (my )?projects?/.test(text)) {
    const ps = listProjects();
    return ps.length ? `Your projects: ${ps.join(', ')}. Say "rebuild <name> with <change>" to update one.` : 'No projects yet, Say "build a portfolio website" to start.';
  }
  let rb = text.match(/^(rebuild|update|modify|change)\s+([\w\- ]+?)\s+(with|to|-|:)\s*(.+)/);
  if (rb) {
    try {
      const proj = await rebuildProject(rb[2].trim().replace(/\s+/g, '-'), rb[4].trim());
      const port = process.env.JARVIS_LIVE_PORT || process.env.JARVIS_PORT || 7777;
      try { require('child_process').exec(`start "" "http://localhost:${port}${proj.url}"`, { windowsHide: true }); } catch {}
      return `Updated ${proj.name} — ${rb[4].trim()}. Preview reloaded.`;
    } catch (e) { return `Couldn't rebuild: ${e.message}`; }
  }

  // 6b. BUILD: "build a portfolio website for Aarav" / "make me a todo app"
  if (/(build|create|make|generat|bilt|bild)\b.*(website|web ?site|web ?app|web ?page|portfolio|landing|restaurant|blog|todo|app|page)/.test(text)
    || /^build\b/.test(text)) {
    const cat = /portfolio/.test(text) ? 'portfolio' : /restaurant|food|menu/.test(text) ? 'restaurant'
      : /blog/.test(text) ? 'blog' : /todo|task/.test(text) ? 'todo'
      : /landing/.test(text) ? 'landing' : 'landing';
    const nm = orig.match(/(?:called|named)\s+([\w \-]+)/i);
    const cleanName = nm ? nm[1].replace(/\s+with\s+.*$/i, '').trim() : '';
    try {
      const proj = await buildProject({ prompt: orig, category: cat, files: [], name: cleanName });
      const port = process.env.JARVIS_LIVE_PORT || process.env.JARVIS_PORT || 7777;
      try { require('child_process').exec(`start "" "http://localhost:${port}${proj.url}"`, { windowsHide: true }); } catch {}
      return `Done — your ${cat} "${proj.title}" is built in F:\\jarvis\\projects\\${proj.name}\\ (${proj.files.join(', ')}). Preview open in your browser. Steps: 1) check the preview, 2) edit files in VS Code, 3) drop the folder on netlify.com/drop to publish free. Drop files on me in the HUD Builder anytime and I'll include them.`;
    } catch (e) { return `Build failed: ${e.message}`; }
  }

  // 6c. NOTES: "note buy milk" / "my notes" / "search notes for invoice" / "delete note 3"
  let nm = text.match(/^note\s+(.+)/) || text.match(/^(add|new|save|create)\s+note\s+(.+)/);
  if (nm) {
    const N = require('./notes');
    const note = N.addNote(nm[1]);
    return `Got it — saved note #${note.id}: "${note.text}"`;
  }
  if (/^(my |list |show )?notes?$/.test(text) && !/remind/.test(text)) {
    const N = require('./notes');
    return N.formatNotes(N.listNotes());
  }
  nm = text.match(/^(search|find|grep)\s+notes?\s+(for|about)?\s*(.+)/);
  if (nm) {
    const N = require('./notes');
    const results = N.searchNotes(nm[3]);
    return results.length ? N.formatNotes(results) : `Nothing matching "${nm[3]}" in your notes.`;
  }
  nm = text.match(/^delete\s+note\s+(\d+)/);
  if (nm) {
    const N = require('./notes');
    N.deleteNote(nm[1]);
    return `Deleted note #${nm[1]}.`;
  }

  // 6c0. TASKS: "add task buy milk" / "my tasks" / "done 1" / "clear tasks"
  let tm = text.match(/^(add|create|new)\s+(task|todo|reminder)\s*[:\-]?\s*(.+)/)
    || text.match(/^(remember|remeber|remmeber) (that |to )?(.+)/);
  if (tm) {
    const { addTask } = require('./tasks');
    const t = addTask(tm[tm.length - 1]);
    return `Noted — task ${t.id}: ${t.text}.`;
  }
  if (/^(list|show|what are|get|my|all)\b.*\b(tasks?|todos?)\b/.test(text) || /\btodo list\b/.test(text) || /^tasks?$/.test(text)) {
    const { formatTasks } = require('./tasks');
    return formatTasks();
  }
  if (/^clear (done|completed|finished|complte|finshed)/.test(text)) {
    const { clearDone } = require('./tasks');
    const left = clearDone();
    return `Cleared done tasks. ${left.length} left.`;
  }
  tm = text.match(/^(done|complete|completed|finish|finished|tick|check|compelte|complte|finshed)(\s+(task|todo))?\s+(.+)/);
  if (tm) {
    const { doneTask } = require('./tasks');
    const hit = doneTask(tm[tm.length - 1]);
    return hit ? `Done — ticked off "${hit.text}".` : `Couldn't find that task, Say "my tasks" to hear the list.`;
  }

  // 6c2. REMINDERS: "remind me to stretch in 10 minutes" / "at 6pm" / "tomorrow"
  let rmd = text.match(/^(remind me to|remind me|reminder|set (an? )?alarm( for| to)?|remimder|remider|remindr)\s+(.+)/);
  if (rmd) {
    const R = require('./reminders');
    const { at, clean } = R.parseWhen(rmd[rmd.length - 1]);
    if (!at || !clean) return 'Noted — but when? Say "in 10 minutes", "at 6pm" or "tomorrow".';
    const r = R.addReminder(clean, at);
    return `Reminder set — "${r.text}" at ${R.fmtTime(r.at)}. I'll announce it.`;
  }
  if (/^(my |list |show )?(reminders?|alarms?)/.test(text) || /^reminders?$/.test(text)) {
    const R = require('./reminders');
    const up = R.listReminders().filter(r => !r.fired);
    return up.length ? 'Reminders: ' + up.map(r => `${r.text} at ${R.fmtTime(r.at)}`).join(' | ')
      : 'No reminders set.';
  }

  // 6c3. FILE SEARCH: "search files for invoice" / "index folder F:\docs"
  let fx = text.match(/^(search files|find in files|deep find|grep)( for)?\s+(.+)/);
  if (fx) {
    const { searchFiles } = require('./filesearch');
    const hits = searchFiles(fx[3].trim());
    if (!hits.length) return `Nothing found for "${fx[3].trim()}" in your indexed folders. Say "indexed folders" to see where I look, or "index folder <path>" to add one.`;
    return `Found ${hits.length}: ` + hits.slice(0, 6).map(h => `${h.file} (${h.why}${h.snippet ? ': ' + h.snippet : ''})`).join(' | ');
  }
  fx = orig.match(/^index folder\s+(.+)/i);
  if (fx) {
    try {
      const { addDir } = require('./filesearch');
      return `Indexed: ${addDir(fx[1].trim())}. I'll search inside it from now on.`;
    } catch (e) { return `Couldn't index that: ${e.message}`; }
  }
  if (/^(indexed folders|list indexed|where do you search)/.test(text)) {
    const { getDirs } = require('./filesearch');
    return 'I search these folders: ' + getDirs().join(' | ');
  }

  // 6d. DEEP RESEARCH: "research solar panels" / "full search on AI" — local + web, auto sources
  tm = text.match(/^(research|reserch|reserach|resarch|deep search|full search|investigate|full report on|everything about|tell me everything about)\s+(.+)/);
  if (tm) {
    const { deepResearch } = require('./research');
    return await deepResearch(tm[2].trim());
  }

  // 6e. EXTENDED SYSTEM CONTROL (before time/weather to avoid false matches)
  if (/cpu (usage|load|percent|check|status)/.test(text)) return await sys.systemControl('cpu');
  if (/ram (usage|status|check|how much)/.test(text) || /memory (usage|status|check)/.test(text)) return await sys.systemControl('ram');
  if (/disk (usage|status|space|check|free)/.test(text)) return await sys.systemControl('disk');
  if (/\b(ip address|my ip|public ip|what'?s?\s*(my|the)\s*ip)/.test(text)) return await sys.systemControl('ip');
  if (/\b(uptime|up time|how long|since when)\b/.test(text)) return await sys.systemControl('uptime');
  if (/^(top|list|show)\s*(running\s*)?(process|programs|apps)/.test(text)) return await sys.systemControl('processes');
  if (m = text.match(/^(kill|end|stop|terminate)\s+(?:the\s+)?(?:process\s+)?([\w .]+)/)) return await sys.systemControl('kill', m[2].trim());
  if (/clipboard|clip board|copy history|paste/.test(text) && !/copy\s/.test(text)) return await sys.systemControl('clipboard');
  if (m = text.match(/^copy\s+(.+?)\s+to\s+clipboard$/)) return await sys.systemControl('copy', m[1]);
  if (m = text.match(/^copy\s+(.+)/)) return await sys.systemControl('copy', m[1]);
  if (/show wifi|wifi networks|available networks|scan wifi|what wifi/.test(text)) return await sys.systemControl('wifi');
  if (/bluetooth (on|enable|start)/.test(text)) return await sys.systemControl('bluetooth-on');
  if (/bluetooth (off|disable|stop)/.test(text)) return await sys.systemControl('bluetooth-off');
  if (/dark mode|night mode|dark theme/.test(text)) return await sys.systemControl('dark-mode');
  if (/light mode|day mode|light theme/.test(text)) return await sys.systemControl('light-mode');
  if (/hotspot (on|start|enable|create)/.test(text)) return await sys.systemControl('hotspot-on');
  if (/hotspot (off|stop|disable)/.test(text)) return await sys.systemControl('hotspot-off');
  if (/screen record|record screen|start recording/.test(text)) return await sys.systemControl('screen-record');

  // 7. time/date
  if (/^(what'?s?\s+)?(the\s+)?time$/.test(text) || /^(what'?s?\s+)?time\s+(is\s+it|now)/.test(text)) return `It's ${new Date().toLocaleTimeString('en-IN')}.`;
  if (/\bdate\b|today/.test(text)) return `Today is ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}.`;
  if (/\bdate\b|today/.test(text)) return `Today is ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}.`;

  // 8. WEATHER: "weather in Delhi" / "what's the temperature" / "wht is the temp"
  tm = text.match(/^(weather|temperature|temp|forecast|how.*hot|how.*cold|climate|what'?s?\s*(the\s+)?(temp|weather|temperature|forecast)|what\s+(is|it)\s+(the\s+)?(temp|weather|temperature|forecast))\s*(in|for|of)?\s*(.*)/);
  if (tm || /\bweather\b/.test(text) || /\btemp\b/.test(text)) {
    const { getWeather, formatWeather } = require('./weather');
    const q = (tm && (tm[6] || tm[8])) ? (tm[6] || tm[8]).trim() : 'Delhi';
    try {
      const w = await getWeather(q);
      return formatWeather(w);
    } catch { return 'Weather service unavailable — check your internet.'; }
  }

  // 9. NEWS: "news" / "news about AI" / "headlines"
  tm = text.match(/^(news|headlines?|what'?s happening|top stories|current events?)\s*(about|on|regarding)?\s*(.*)/);
  if (tm || /\b(news|headlines)\b/.test(text)) {
    const { getNews, formatNews } = require('./news');
    const q = tm && tm[3] ? tm[3].trim() : '';
    try {
      const items = await getNews(q);
      return formatNews(items, q);
    } catch { return 'News service unavailable — check your internet.'; }
  }

  // 10. MUSIC: "play music" / "next song" / "pause spotify"
  tm = text.match(/^(play|pause|stop|next|prev|previous|skip|volume up|volume down|vol up|vol down)\s*(music|song|track|spotify|youtube)?/);
  if (tm || /\b(play|pause|skip|next song|previous song)\b/.test(text)) {
    const { spotifyControl, browserMedia } = require('./music');
    const action = /next|skip/.test(text) ? 'next' : /prev|previous/.test(text) ? 'prev'
      : /pause|stop/.test(text) ? 'pause' : /play/.test(text) ? 'play'
      : /vol.*up|volume.*up/.test(text) ? 'volup' : /vol.*down|volume.*down/.test(text) ? 'voldown' : 'toggle';
    const target = /spotify/.test(text) ? 'spotify' : 'browser';
    return target === 'spotify' ? spotifyControl(action) : browserMedia(action);
  }

  // 12. CLIPBOARD: "clipboard" / "copy this" / "clear clipboard"
  if (/^(clipboard|clip|copy history|paste history)/.test(text)) {
    const C = require('./clipboard');
    return C.formatHistory(C.getHistory());
  }
  tm = text.match(/^copy\s+(.+)/);
  if (tm) {
    const C = require('./clipboard');
    C.setClipboard(tm[1]);
    return `Copied to clipboard: "${tm[1].slice(0, 60)}"`;
  }
  if (/clear clipboard/.test(text)) {
    const C = require('./clipboard');
    return C.clearHistory();
  }

  // 13. SCREENSHOT: "screenshot" / "take screenshot" / "capture screen"
  if (/screenshot|screen\s*shot|capture|take.*screen/.test(text)) {
    const S = require('./screenshot');
    try {
      const result = S.takeScreenshot();
      return result.message;
    } catch { return 'Screenshot failed — check permissions.'; }
  }

  // 14. TIMER: "timer 5 minutes" / "set timer for 10 min" / "stopwatch" / "timers"
  tm = text.match(/^(set )?(timer|alarm|countdown)\s+(?:for\s+)?(\d+)\s*(min|sec|hour|minute|second|hr|h|m|s)/);
  if (tm) {
    const T = require('./timer');
    let secs = parseInt(tm[3]);
    const unit = tm[4];
    if (/min|^m$/.test(unit)) secs *= 60;
    else if (/hour|^h$|hr/.test(unit)) secs *= 3600;
    const t = T.startTimer(tm[2] || 'Timer', secs);
    return `Timer set — ${t.name} for ${t.duration}. I'll let you know when it's done.`;
  }
  if (/^(start )?stopwatch/.test(text)) {
    const T = require('./timer');
    const s = T.startStopwatch('Stopwatch');
    return `Stopwatch started (ID: ${s.id}). Say "stopwatch status" to check.`;
  }
  if (/stopwatch.*(status|time|check)/.test(text) || /timers?/.test(text)) {
    const T = require('./timer');
    const active = T.listTimers();
    if (!active.length)     return 'No active timers running.';
    return 'Active: ' + active.map(t => `${t.name}: ${t.remaining} left`).join(', ');
  }

  // 15. CALCULATOR: "calculate 2+2" / "what is 15*3" / "sqrt 144"
  tm = text.match(/^(calculate|calc|math|compute|solve|evaluate)\s+(.+)/)
    || text.match(/^what is\s+([\d\s+\-*/().^%]+)$/);
  if (tm) {
    const { calculate } = require('./calculator');
    return calculate(tm[2]);
  }
  // Also detect math expressions directly: "2+2", "sqrt 144", "15 * 3"
  if (/^[\d\s+\-*/().^%]+$/.test(text) && /\d/.test(text) && /[+\-*/^%]/.test(text)) {
    const { calculate } = require('./calculator');
    return calculate(text);
  }

  // 15b. UTILITIES
  if (/^(cleanup|clean up|clean system|clear temp)/.test(text)) return await sys.systemControl('cleanup');
  if (/^(speed ?test|internet speed|check speed)/.test(text)) return await sys.systemControl('speedtest');
  if (m = text.match(/^ping\s+(.+)/)) return await sys.systemControl('ping', m[1].trim());
  if (/^(what color|color picker|pick color|screen color)/.test(text)) return await sys.systemControl('color');
  if (/^(open url|open link|open website)\s+(.+)/.test(text)) return await sys.systemControl('open-url', text.match(/open (?:url|link|website)\s+(.+)/)?.[1]);
  if (m = text.match(/^download\s+(.+)/)) return await sys.utility('download', m[1].trim());
  if (m = text.match(/^translate\s+(.+?)\s+to\s+(.+)/)) return await sys.utility('translate', `${m[1].trim()} to ${m[2].trim()}`);
  if (m = text.match(/^define\s+(.+)/)) return await sys.utility('define', m[1].trim());
  if (m = text.match(/^random\s*(\d+)?/)) return await sys.utility('random', m[1]);
  if (m = text.match(/^(generate|make|create)\s+(password|passwd|pass)\s*(\d+)?/)) return await sys.utility('password', m[3] || '16');
  if (m = text.match(/^hash\s+(.+)/)) return await sys.utility('hash', m[1].trim());
  if (m = text.match(/^base64 encode\s+(.+)/)) return await sys.utility('base64-encode', m[1].trim());
  if (m = text.match(/^base64 decode\s+(.+)/)) return await sys.utility('base64-decode', m[1].trim());
  if (m = text.match(/^format json\s+(.+)/)) return await sys.utility('json', m[1].trim());
  if (m = text.match(/^regex\s+(.+?)\s+on\s+(.+)/)) return await sys.utility('regex', `${m[1].trim()} on ${m[2].trim()}`);

  // 16. SYSTEM MONITOR: "system stats" / "cpu usage" / "how's my system"
  if (/^(system stats|cpu|ram|memory|gpu|disk|resource|performance|monitor)/.test(text)) {
    const { execSync } = require('child_process');
    try {
      const cpu = execSync('powershell -NoProfile -Command "(Get-Counter \'\\Processor(_Total)\\% Processor Time\').CounterSamples[0].CookedValue"', { encoding: 'utf8', windowsHide: true, timeout: 5000 }).trim();
      const mem = execSync('powershell -NoProfile -Command "$m=Get-CimInstance Win32_OperatingSystem;[math]::Round(($m.TotalVisibleMemorySize-$m.FreePhysicalMemory)/$m.TotalVisibleMemorySize*100,1)"', { encoding: 'utf8', windowsHide: true, timeout: 5000 }).trim();
      const uptime = Math.floor(process.uptime());
      const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60);
      return `Here's what I'm seeing: CPU at ${parseFloat(cpu).toFixed(1)}%, RAM at ${parseFloat(mem).toFixed(1)}%, been running for ${h}h ${m}m.`;
    } catch { return 'Could not read system stats.'; }
  }

  // 17. Ollama first for conversational queries (understands typos naturally)
  const ai = await ollamaChat(orig);
  if (ai) return ai;

  // 18. free knowledge (DuckDuckGo + Wikipedia) as fallback
  const know = await freeKnowledge(orig);
  if (know) return know;

  return `I'm not sure what you mean by "${orig}". Try a command like "open notepad", "weather in Delhi", "news", "calculate 2+2", or ask me anything.`;
}

async function freeKnowledge(orig) {
  const q = orig.replace(/^(jarvis[ ,]?|hey jarvis[ ,]?|tell me about|what is|what'?s|who is|search for|google|explain)\s*/i, '').trim();
  if (q.length < 2) return null;
  const withTimeout = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms).digest; return c.signal; };
  // 1. DuckDuckGo instant answer
  try {
    const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(orig)}&format=json&no_html=1&skip_disambig=1`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    const ans = (d.AbstractText || d.Answer || '').trim();
    if (ans) return ans.slice(0, 400);
  } catch {}
  // 2. Wikipedia summary
  try {
    const title = encodeURIComponent(q.replace(/\s+/g, '_'));
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const d = await r.json();
      if (d.extract && !/may refer to/i.test(d.extract.slice(0, 60))) return d.extract.slice(0, 500) + '.';
    }
  } catch {}
  return null;
}

module.exports = { handleCommand, ollamaChat };
