// Music control — Spotify desktop + YouTube via PowerShell
const { execSync } = require('child_process');

function ps(command) {
  try {
    return execSync(`powershell -NoProfile -Command "${command}"`, { encoding: 'utf8', windowsHide: true, timeout: 8000 }).trim();
  } catch { return ''; }
}

function spotifyControl(action) {
  switch (action) {
    case 'play': case 'pause': case 'toggle':
      ps `(Get-Process -Name Spotify -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle}).Count`;
      ps `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{MEDIA_PLAY_PAUSE}')`;
      return `Spotify ${action === 'toggle' ? 'toggled' : action}d.`;
    case 'next':
      ps `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{MEDIA_NEXT}')`;
      return 'Skipping ahead.';
    case 'prev': case 'previous':
      ps `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{MEDIA_PREV}')`;
      return 'Going back.';
    case 'volup':
      ps `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{MEDIA_VOLUME_UP}')`;
      return 'Volume up.';
    case 'voldown':
      ps `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{MEDIA_VOLUME_DOWN}')`;
      return 'Volume down.';
    default:
      return 'Music commands: play, pause, next, previous, volup, voldown.';
  }
}

function browserMedia(action) {
  // Control browser media (YouTube, etc.) via global media keys
  const key = action === 'play' || action === 'pause' || action === 'toggle' ? '{MEDIA_PLAY_PAUSE}'
    : action === 'next' ? '{MEDIA_NEXT}'
    : action === 'prev' || action === 'previous' ? '{MEDIA_PREV}' : '{MEDIA_PLAY_PAUSE}';
  ps `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${key}')`;
  return `Media ${action === 'play' ? 'playing' : action === 'pause' ? 'paused' : 'toggled'}.`;
}

module.exports = { spotifyControl, browserMedia };
