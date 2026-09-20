// Screenshot tool — capture screen + clipboard history
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SHOTS_DIR = path.join(__dirname, '..', 'data', 'screenshots');

function takeScreenshot(region) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = path.join(SHOTS_DIR, `screenshot-${ts}.png`);

  if (region === 'window') {
    // Active window
    execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen(0, 0, 0, 0, $bmp.Size); $bmp.Save('${file}'); $g.Dispose(); $bmp.Dispose()"`, { windowsHide: true, timeout: 10000 });
  } else {
    // Full screen
    execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen(0, 0, 0, 0, $bmp.Size); $bmp.Save('${file}'); $g.Dispose(); $bmp.Dispose()"`, { windowsHide: true, timeout: 10000 });
  }

  // Copy to clipboard
  execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Drawing.Image]::FromFile('${file}'); [System.Windows.Forms.Clipboard]::SetImage($img); $img.Dispose()"`, { windowsHide: true, timeout: 5000 });

  return { file, message: `Screenshot captured — saved and copied to your clipboard.` };
}

function listScreenshots() {
  try {
    return fs.readdirSync(SHOTS_DIR).filter(f => f.endsWith('.png')).sort().reverse().slice(0, 10);
  } catch { return []; }
}

module.exports = { takeScreenshot, listScreenshots };
