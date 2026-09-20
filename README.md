# JARVIS — native AI for Windows

Type `jarvis` in cmd → HUD opens. Say anything, he does it.

## Quick start
```cmd
cd F:\jarvis
npm install
npm start
:: new cmd (after install.cmd):
jarvis
jarvis "day report"
jarvis "go to chrome incognito and search cats"
```

## What v1 does (full potential starter)
- **Apps:** `open notepad / chrome / vscode / spotify...`, `close chrome`
- **System:** shutdown, restart, sleep, lock, volume 0-100, mute, brightness, wifi on/off, battery, screenshot
- **Files:** list / create / delete / open / find files
- **Browser:** `go to chrome and open incognito tab and search X`, youtube search, any site
- **Day report:** time, date, battery, disk, status
- **Voice:** mic button (Chrome/Edge speech) in, Jarvis voice out
- **AI brain:** local Ollama `llama3.1:8b` if installed, else smart rule-based fallback

## Get full AI brain (recommended, free offline)
1. Install https://ollama.com/download
2. `ollama pull llama3.1:8b`
3. `ollama serve` (usually auto-runs)
4. Restart Jarvis — chat now uses local LLM

## Make .exe (desktop app)
```cmd
npm install --save-dev electron electron-builder
:: then I can wire Electron wrapper for you — ask me
```

## Structure
```
F:/jarvis/
  main.js        server + HUD host :7777
  core/brain.js  Ollama + command parser
  core/system.js apps/system/files/browser control
  ui/            Jarvis HUD (HTML/CSS/JS)
  bin/jarvis.js + jarvis.cmd   `jarvis` command
```
