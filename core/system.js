const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true, timeout: 30000 }, (err, stdout, stderr) => {
      resolve({ err, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
    });
  });
}

function ps(cmd) {
  // run via powershell for system controls
  return run(`powershell -NoProfile -Command "${cmd.replace(/"/g, "'")}"`);
}

// ---------- APPS ----------
const APP_MAP = {
  chrome: 'start chrome',
  edge: 'start msedge',
  firefox: 'start firefox',
  notepad: 'start notepad',
  calculator: 'start calc',
  calc: 'start calc',
  vscode: 'code',
  code: 'code',
  terminal: 'start wt',
  cmd: 'start cmd',
  explorer: 'start explorer',
  files: 'start explorer',
  spotify: 'start spotify',
  discord: 'start "" "https://discord.com/app"',
  telegram: 'start https://web.telegram.org',
  slack: 'start slack:',
  word: 'start winword',
  excel: 'start excel',
  paint: 'start mspaint',
  taskmanager: 'start taskmgr',
  settings: 'start ms-settings:',
};

async function openApp(name) {
  name = name.toLowerCase().trim();
  const cmd = APP_MAP[name] || `start "" "${name}"`;
  const r = await run(cmd);
  if (r.err) return `Failed to open ${name}: ${r.stderr || r.err.message}`;
  return `Opening ${name}.`;
}

async function closeApp(name) {
  name = name.toLowerCase().trim();
  const exeMap = {
    chrome: 'chrome.exe', edge: 'msedge.exe', notepad: 'notepad.exe',
    code: 'Code.exe', vscode: 'Code.exe', spotify: 'Spotify.exe',
    discord: 'Discord.exe', firefox: 'firefox.exe', explorer: 'explorer.exe'
  };
  const exe = exeMap[name] || `${name}.exe`;
  const r = await run(`taskkill /IM "${exe}" /F`);
  if (r.err) return `Couldn't close ${name}. Is it running?`;
  return `Closed ${name}.`;
}

// ---------- SYSTEM ----------
async function systemControl(action, value) {
  action = action.toLowerCase();
  switch (action) {
    case 'shutdown': await run('shutdown /s /t 5'); return 'Shutting down in 5 seconds.';
    case 'restart': await run('shutdown /r /t 5'); return 'Restarting in 5 seconds.';
    case 'sleep': await run('rundll32.exe powrprof.dll,SetSuspendState 0,1,0'); return 'Going to sleep.';
    case 'lock': await run('rundll32.exe user32.dll,LockWorkStation'); return 'Locked.';
    case 'cancel-shutdown': await run('shutdown /a'); return 'Shutdown cancelled.';
    case 'volume': {
      const v = Math.max(0, Math.min(100, parseInt(value) || 50));
      await ps(`$o=(New-Object -ComObject WScript.Shell); 1..20 | % { $o.SendKeys([char]174) }; 1..([math]::Round(${v}/5)) | % { $o.SendKeys([char]175) }`);
      return `Volume set around ${v} percent.`;
    }
    case 'mute': await ps(`$o=(New-Object -ComObject WScript.Shell); $o.SendKeys([char]173)`); return 'Muted.';
    case 'brightness': {
      const b = Math.max(10, Math.min(100, parseInt(value) || 80));
      await ps(`(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${b})`);
      return `Brightness set to ${b} percent.`;
    }
    case 'wifi-off': await run('netsh interface set interface "Wi-Fi" admin=disable'); return 'Wi-Fi off.';
    case 'wifi-on': await run('netsh interface set interface "Wi-Fi" admin=enable'); return 'Wi-Fi on.';
    case 'battery': {
      const r = await ps(`Get-WmiObject Win32_Battery | Select-Object -ExpandProperty EstimatedChargeRemaining`);
      return r.stdout ? `Battery at ${r.stdout} percent.` : 'Battery info unavailable (desktop?).';
    }
    case 'screenshot': {
      const p = path.join(os.homedir(), 'Pictures', `jarvis-${Date.now()}.png`);
      await ps(`Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $b=New-Object Drawing.Bitmap([Windows.Forms.Screen]::PrimaryScreen.Bounds.Width,[Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $g=[Drawing.Graphics]::FromImage($b); $g.CopyFromScreen(0,0,0,0,$b.Size); $b.Save('${p}')`);
      return `Screenshot saved to Pictures.`;
    }
    case 'cpu': {
      const r = await ps(`(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples[0].CookedValue`);
      return `CPU at ${parseFloat(r.stdout || 0).toFixed(1)} percent.`;
    }
    case 'ram': {
      const r = await ps(`$m=Get-CimInstance Win32_OperatingSystem; [math]::Round(($m.TotalVisibleMemorySize-$m.FreePhysicalMemory)/$m.TotalVisibleMemorySize*100,1)`);
      return `RAM at ${r.stdout || '?'} percent.`;
    }
    case 'disk': {
      const r = await ps(`Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,@{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,1)}},@{N='TotalGB';E={[math]::Round($_.Size/1GB,1)}} | Format-Table -AutoSize`);
      return `Disk info:\n${r.stdout}`;
    }
    case 'ip': {
      const r = await run(`powershell -NoProfile -Command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing -TimeoutSec 5).Content"`);
      return `Your public IP: ${r.stdout || r.stderr || 'unknown'}`;
    }
    case 'uptime': {
      const r = await ps(`$b=(Get-CimInstance Win32_OperatingSystem).LastBootUpTime; $d=(Get-Date)-$b; "{0}d {1}h {2}m" -f $d.Days,$d.Hours,$d.Minutes`);
      return `System uptime: ${r.stdout || 'unknown'}`;
    }
    case 'processes': {
      const r = await ps(`Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name,@{N='CPU';E={[math]::Round($_.CPU,1)}},@{N='MB';E={[math]::Round($_.WorkingSet64/1MB,0)}} | Format-Table -AutoSize`);
      return `Top 10 processes:\n${r.stdout}`;
    }
    case 'kill': {
      if (!value) return 'Specify the process name to kill.';
      const r = await run(`taskkill /IM "${value}.exe" /F`);
      return r.err ? `Couldn't kill ${value}. Is it running?` : `Killed ${value}.`;
    }
    case 'clipboard': {
      const r = await ps(`Get-Clipboard`);
      return `Clipboard: ${r.stdout || '(empty)'}`;
    }
    case 'copy': {
      if (!value) return 'Specify text to copy.';
      await ps(`Set-Clipboard -Value "${value.replace(/"/g, '""')}"`);
      return `Copied to clipboard.`;
    }
    case 'wifi': {
      const r = await ps(`netsh wlan show networks mode=bssid | Select-String "SSID|Signal|Authentication"`);
      return `Wi-Fi networks:\n${r.stdout || 'No networks found.'}`;
    }
    case 'bluetooth-on': {
      const r = await ps(`Get-Service bthserv | Set-Service -StartupType Automatic; Start-Service bthserv`);
      return r.err ? 'Bluetooth service not found.' : 'Bluetooth enabled.';
    }
    case 'bluetooth-off': {
      const r = await ps(`Stop-Service bthserv -Force; Set-Service bthserv -StartupType Disabled`);
      return r.err ? 'Bluetooth service not found.' : 'Bluetooth disabled.';
    }
    case 'dark-mode': {
      await ps(`Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name AppsUseLightTheme -Value 0`);
      await ps(`Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name SystemUsesLightTheme -Value 0`);
      return 'Dark mode enabled.';
    }
    case 'light-mode': {
      await ps(`Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name AppsUseLightTheme -Value 1`);
      await ps(`Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name SystemUsesLightTheme -Value 1`);
      return 'Light mode enabled.';
    }
    case 'hotspot-on': {
      const r = await ps(`netsh wlan set hostednetwork mode=allow ssid="JarvisHotspot" key="jarvis123"; netsh wlan start hostednetwork`);
      return r.err ? 'Failed to start hotspot.' : 'Hotspot started. SSID: JarvisHotspot, Password: jarvis123';
    }
    case 'hotspot-off': {
      await ps(`netsh wlan stop hostednetwork`);
      return 'Hotspot stopped.';
    }
    case 'screen-record': {
      return 'Screen recording requires OBS or ffmpeg. Say "install obs" or "record screen with ffmpeg".';
    }
    case 'cleanup': {
      await ps(`Remove-Item "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue`);
      await ps(`Remove-Item "$env:LOCALAPPDATA\\Temp\\*" -Recurse -Force -ErrorAction SilentlyContinue`);
      await ps(`Remove-Item "$env:LOCALAPPDATA\\Microsoft\\Windows\\INetCache\\*" -Recurse -Force -ErrorAction SilentlyContinue`);
      await ps(`Remove-Item "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer\\thumbcache_*.db" -Force -ErrorAction SilentlyContinue`);
      return 'Cleaned temp files, browser cache, and thumbnails.';
    }
    case 'speedtest': {
      await run('start chrome "https://www.speedtest.net"');
      return 'Opening Speedtest. Run the test from the browser.';
    }
    case 'ping': {
      if (!value) return 'Specify a host to ping. Example: ping google.com';
      const r = await ps(`Test-Connection -ComputerName "${value}" -Count 4 | Select-Object Address,ResponseTime | Format-Table -AutoSize`);
      return `Ping results for ${value}:\n${r.stdout || 'unreachable'}`;
    }
    case 'screenshot-area': {
      const p = path.join(os.homedir(), 'Pictures', `jarvis-${Date.now()}.png`);
      await ps(`Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $b=New-Object Drawing.Bitmap([Windows.Forms.Screen]::PrimaryScreen.Bounds.Width,[Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $g=[Drawing.Graphics]::FromImage($b); $g.CopyFromScreen(0,0,0,0,$b.Size); $b.Save('${p}')`);
      return `Screenshot saved to Pictures.`;
    }
    case 'color': {
      const r = await ps(`Add-Type -AssemblyName System.Windows.Forms; $bmp=New-Object Drawing.Bitmap([Windows.Forms.Screen]::PrimaryScreen.Bounds.Width,[Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $g=[Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen(0,0,0,0,$bmp.Size); $c=$bmp.GetPixel(960,540); Write-Output "RGB($($c.R),$($c.G),$($c.B)) #"+$c.R.ToString("X2")+$c.G.ToString("X2")+$c.B.ToString("X2")`);
      return `Center pixel color: ${r.stdout}`;
    }
    case 'audio-volume': {
      const r = await ps(`$vol=(Get-AudioDevice -PlaybackVolume -ErrorAction SilentlyContinue); if($vol){$vol}else{"Volume info unavailable"}`);
      return `Volume: ${r.stdout || 'unknown'}`;
    }
    case 'open-url': {
      if (!value) return 'Specify a URL.';
      await run(`start "" "${value}"`);
      return `Opened: ${value}`;
    }
    default: return `Unknown system command: ${action}`;
  }
}

// ---------- FILES ----------
async function fileOp(op, target, dest) {
  try {
    if (op === 'list') {
      const dir = target || os.homedir();
      const files = fs.readdirSync(dir).slice(0, 40);
      return `In ${dir}: ${files.join(', ')}`;
    }
    if (op === 'create-file') { fs.writeFileSync(target, ''); return `Created file ${target}.`; }
    if (op === 'create-folder') { fs.mkdirSync(target, { recursive: true }); return `Created folder ${target}.`; }
    if (op === 'delete') {
      const st = fs.statSync(target);
      if (st.isDirectory()) fs.rmSync(target, { recursive: true }); else fs.unlinkSync(target);
      return `Deleted ${target}.`;
    }
    if (op === 'open') { await run(`start "" "${target}"`); return `Opened ${target}.`; }
    if (op === 'search') {
      const r = await run(`where /R "${os.homedir()}" "${target}"`);
      return r.stdout ? `Found:\n${r.stdout.slice(0, 1000)}` : `No file named ${target} found.`;
    }
  } catch (e) { return `File error: ${e.message}`; }
  return 'Unknown file op.';
}

// ---------- BROWSER (Chrome) ----------
// NOTE: uses your REAL Chrome (normal profile, no automation flags) so Google
// sees a regular human browser -> no captcha. Playwright automation was the
// captcha cause (webdriver flag + fresh bot profile), so it's opt-in only.
async function browserAction(text) {
  // text examples: "open incognito tab and search cats", "go to chrome and search x", "open youtube"
  const incognito = /incogn|private/i.test(text);
  const yt = /youtube/i.test(text);
  const useBing = /using bing|\bbing\b/i.test(text);
  const m = text.match(/search (?:for )?(.+)/i) || text.match(/open (.+)/i);
  let query = m ? m[2] || m[1] : '';
  query = (query || '')
    .replace(/in chrome|on chrome|in incognito|on youtube|using bing|\btab\b/gi, '')
    .replace(/^(for|this|that)\s+/i, '')
    .trim();

  let url;
  if (yt && !query) url = 'https://youtube.com';
  else if (/youtube.*search|search.*youtube/i.test(text) && query)
    url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  else if (query && /^(https?:\/\/|[\w-]+\.(com|net|org|io|in|ai|gov|edu))/i.test(query))
    url = query.startsWith('http') ? query : 'https://' + query;
  else if (query)
    url = useBing
      ? `https://www.bing.com/search?q=${encodeURIComponent(query)}`
      : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  else url = useBing ? 'https://www.bing.com' : 'https://www.google.com';

  // PRIMARY: real Chrome with your profile -> human traffic, no captcha.
  // (non-incognito uses your cookies/login = most trusted; incognito is still
  // a real browser so far cleaner than automation, but has no cookies.)
  const profile = process.env.JARVIS_CHROME_PROFILE || 'Default';
  const profileArg = incognito ? '' : ` --profile-directory="${profile}"`;
  const r = await run(`start chrome${incognito ? ' --incognito' : ''}${profileArg} "${url}"`);
  if (!r.err) return `Chrome ${incognito ? 'incognito ' : ''}opened${query ? ` — searching ${query}` : ''}. No captcha this time.`;

  // OPT-IN advanced automation (needs JARVIS_AUTO=1): persistent real profile
  if (process.env.JARVIS_AUTO === '1') {
    try {
      let chromium;
      try { ({ chromium } = require('playwright')); }
      catch { return 'Automation mode needs `npm i playwright` first. Normal Chrome mode still works.'; }
      const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
      const ctx = await chromium.launchPersistentContext(userDataDir, {
        channel: 'chrome', headless: false,
        args: incognito ? ['--incognito'] : []
      });
      const page = ctx.pages()[0] || await ctx.newPage();
      await page.goto(url);
      return `Chrome opened and under my control${query ? ` — searching ${query}` : ''}.`;
    } catch (e) { return `Chrome launch failed: ${e.message}`; }
  }
  return `Couldn't launch Chrome. Is it installed?`;
}

// ---------- DAY REPORT ----------
async function dayReport() {
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const bat = await systemControl('battery');
  const disk = await run('wmic logicaldisk get caption,freespace,size');
  return `Good day. It's ${dateStr}, ${timeStr}. ${bat} System is operational. Disk:\n${disk.stdout.split('\n').slice(0, 4).join('\n')}`;
}

// ---------- SEND KEYS ----------
function escapeForSendKeys(text) {
  return text.replace(/"/g, '`"');
}

async function sendKeys(text) {
  const escaped = escapeForSendKeys(text);
  const r = await ps(`$o=(New-Object -ComObject WScript.Shell); $o.SendKeys("${escaped}")`);
  if (r.err) return `Failed to send keys: ${r.stderr || r.err.message}`;
  return `Sent keys: ${text}`;
}

// ---------- APP AUTOMATION ----------
async function appAutomation(app, action, target, message) {
  app = (app || '').toLowerCase().trim();
  action = (action || '').toLowerCase().trim();
  const isMsg = ['msg', 'send', 'message', 'text', 'chat'].includes(action);

  // --- WhatsApp (web) ---
  if (app === 'whatsapp') {
    const phone = (target || '').replace(/[^0-9+]/g, '');
    const msg = message || '';
    if (!phone) return 'Please provide a phone number for WhatsApp.';
    const url = `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(msg)}`;
    const r = await run(`start chrome "${url}"`);
    if (r.err) return `Couldn't open WhatsApp Web.`;
    return `Opening WhatsApp Web for ${phone}${msg ? ` with message: ${msg}` : ''}. Send it manually from the browser.`;
  }

  // --- Discord ---
  if (app === 'discord') {
    if (isMsg || action === 'open') {
      const name = target || '';
      const msg = message || '';
      await run('start "" "https://discord.com/app"');
      if (!name) return 'Opened Discord.';
      return `Opened Discord. To message ${name}${msg ? `: "${msg}"` : ''}, use Ctrl+K in Discord to search for ${name}.`;
    }
    return `Discord action "${action}" not recognized. Use: open, msg, send, message.`;
  }

  // --- Gmail ---
  if (app === 'gmail' || app === 'email' || app === 'mail') {
    const to = target || '';
    const sub = message ? message.split('|')[0] : '';
    const body = message ? (message.split('|')[1] || '') : '';
    if (to) {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
      const r = await run(`cmd /c start "" "${url}"`);
      if (r.err) return `Couldn't open Gmail compose.`;
      return `Opening Gmail compose for ${to}.`;
    }
    await run('start chrome "https://mail.google.com"');
    return 'Opening Gmail.';
  }

  // --- Telegram ---
  if (app === 'telegram') {
    const username = (target || '').replace(/@/g, '');
    if (isMsg || action === 'open') {
      if (username) {
        const url = `https://t.me/${username}`;
        const r = await run(`start chrome "${url}"`);
        if (r.err) return `Couldn't open Telegram for @${username}.`;
        return `Opening Telegram chat with @${username}. Send your message from the browser.`;
      }
      await run('start https://web.telegram.org');
      return 'Opened Telegram Web.';
    }
    return `Telegram action "${action}" not recognized. Use: open, msg, send.`;
  }

  // --- Slack ---
  if (app === 'slack') {
    const channel = target || '';
    const msg = message || '';
    await run('start "" "https://slack.com/signin"');
    if (!channel) return 'Opened Slack.';
    return `Opened Slack. To message ${channel}${msg ? `: "${msg}"` : ''}, use Ctrl+K in Slack to search for ${channel}.`;
  }

  // --- Generic apps ---
  switch (action) {
    case 'open':
      return await openApp(app);
    case 'type': {
      const t = target || message || '';
      if (!t) return 'Nothing to type.';
      const esc = escapeForSendKeys(t);
      await ps(`$o=(New-Object -ComObject WScript.Shell); $o.SendKeys("${esc}")`);
      return `Typed: ${t}`;
    }
    case 'press': {
      const key = target || '';
      if (!key) return 'Specify a key to press.';
      await ps(`$o=(New-Object -ComObject WScript.Shell); $o.SendKeys("{${key}}")`);
      return `Pressed: ${key}`;
    }
    case 'click': {
      const x = parseInt(target) || 100;
      const y = parseInt(message) || 100;
      await ps(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object Drawing.Point(${x},${y}); Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class Click{[DllImport(\"user32.dll\")]public static extern void mouse_event(uint d,uint x,uint y,uint dd,uint dd2);}'; [Click]::mouse_event(0x0002,0,0,0,0); [Click]::mouse_event(0x0004,0,0,0,0)`);
      return `Clicked at (${x}, ${y}).`;
    }
    default:
      return `App automation: unknown action "${action}". Use: open, type, press, click, msg, send, message.`;
  }
}

// ---------- UTILITY ----------
async function utility(action, value) {
  action = action.toLowerCase();
  switch (action) {
    case 'download': {
      if (!value) return 'Specify a URL to download.';
      const fileName = value.split('/').pop().split('?')[0] || 'download';
      const dest = path.join(os.homedir(), 'Downloads', fileName);
      const r = await ps(`Invoke-WebRequest -Uri "${value}" -OutFile "${dest}" -UseBasicParsing -TimeoutSec 60`);
      return r.err ? `Download failed: ${r.stderr}` : `Downloaded to Downloads/${fileName}`;
    }
    case 'translate': {
      if (!value) return 'Specify text and language. Example: translate hello to spanish';
      const m = value.match(/(.+?)\s+to\s+(.+)/);
      if (!m) return 'Format: translate [text] to [language]';
      const text = m[1].trim();
      const lang = m[2].trim();
      const r = await run(`curl -s "https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${encodeURIComponent(lang)}"`);
      try {
        const j = JSON.parse(r.stdout);
        return `Translation (${lang}): ${j.responseData.translatedText}`;
      } catch { return 'Translation failed.'; }
    }
    case 'define': {
      if (!value) return 'Specify a word to define.';
      const r = await run(`curl -s "https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(value)}"`);
      try {
        const j = JSON.parse(r.stdout);
        const def = j[0]?.meanings?.[0]?.definitions?.[0]?.definition;
        return def ? `${value}: ${def}` : `No definition found for "${value}".`;
      } catch { return `Couldn't define "${value}".`; }
    }
    case 'random': {
      const min = 1, max = parseInt(value) || 100;
      return `Random number: ${Math.floor(Math.random() * (max - min + 1)) + min}`;
    }
    case 'password': {
      const len = parseInt(value) || 16;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let pass = '';
      for (let i = 0; i < len; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
      return `Generated password (${len} chars): ${pass}`;
    }
    case 'json': {
      if (!value) return 'Specify JSON to format.';
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      } catch { return 'Invalid JSON.'; }
    }
    case 'base64-encode': {
      if (!value) return 'Specify text to encode.';
      return `Base64: ${Buffer.from(value).toString('base64')}`;
    }
    case 'base64-decode': {
      if (!value) return 'Specify base64 to decode.';
      try { return `Decoded: ${Buffer.from(value, 'base64').toString('utf8')}`; }
      catch { return 'Invalid base64.'; }
    }
    case 'hash': {
      if (!value) return 'Specify text to hash.';
      const crypto = require('crypto');
      const md5 = crypto.createHash('md5').update(value).digest('hex');
      const sha256 = crypto.createHash('sha256').update(value).digest('hex');
      return `MD5: ${md5}\nSHA256: ${sha256}`;
    }
    case 'regex': {
      if (!value) return 'Format: regex [pattern] on [text]';
      const rm = value.match(/(.+?)\s+on\s+(.+)/);
      if (!rm) return 'Format: regex [pattern] on [text]';
      try {
        const matches = new RegExp(rm[1], 'gi').exec(rm[2]);
        return matches ? `Match: ${matches.join(', ')}` : 'No matches.';
      } catch { return 'Invalid regex.'; }
    }
    default: return `Unknown utility: ${action}`;
  }
}

module.exports = { openApp, closeApp, systemControl, fileOp, browserAction, dayReport, sendKeys, appAutomation, utility, run };
