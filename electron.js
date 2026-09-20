// JARVIS native shell: server runs INSIDE this process, UI in a real window.
// No browser, no localhost typing, no Chrome needed.
const { app, BrowserWindow } = require('electron');
const http = require('http');

process.env.JARVIS_EMBED = '1';
require('./main.js'); // starts the Jarvis core (sets JARVIS_LIVE_PORT when ready)

function findServer(tries = 60) {
  return new Promise((resolve) => {
    let n = 0;
    const t = setInterval(() => {
      n++;
      let pending = 3, settled = false;
      for (const p of [7777, 7778, 7779]) {
        http.get(`http://localhost:${p}/api/health`, () => {
          if (!settled) { settled = true; clearInterval(t); resolve(p); }
        }).on('error', () => {
          if (--pending === 0 && n >= tries && !settled) { settled = true; clearInterval(t); resolve(null); }
        });
      }
    }, 500);
  });
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#060607',
    title: 'JARVIS',
    autoHideMenuBar: true,
    show: false
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  const port = await findServer();
  if (port) {
    win.loadURL(`http://localhost:${port}`);
    win.webContents.on('did-finish-load', () => {
      setTimeout(() => win.webContents.executeJavaScript('window.dispatchEvent(new Event("resize"))'), 400);
    });
  }
  else win.loadURL('data:text/html,<body style="background:black;color:#f66;font-family:sans-serif"><h1>Jarvis core failed to start</h1></body>');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit(); // core rides along, quits too
});
