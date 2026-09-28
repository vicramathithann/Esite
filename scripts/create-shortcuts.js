const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const STARTUP_DIR = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const DESKTOP_DIR = path.join(process.env.USERPROFILE, 'OneDrive', 'Desktop');

const psScript = `
$wsh = New-Object -COM WScript.Shell

# 1. Startup Shortcut (so it boots silently with Windows)
$startupLink = '${path.join(STARTUP_DIR, 'VMMobiles.lnk').replace(/\\/g, '\\\\')}'
$sc1 = $wsh.CreateShortcut($startupLink)
$sc1.TargetPath = 'wscript.exe'
$sc1.Arguments = '"${path.join(PROJECT_DIR, 'start-hidden.vbs').replace(/\\/g, '\\\\')}"'
$sc1.WorkingDirectory = '${PROJECT_DIR.replace(/\\/g, '\\\\')}'
$sc1.Description = 'Start VM Mobiles Online Store on Windows Startup'
$sc1.Save()

# 2. Desktop Shortcut - Start VM Mobiles
$desktopLink1 = '${path.join(DESKTOP_DIR, 'Start VM Mobiles.lnk').replace(/\\/g, '\\\\')}'
$sc2 = $wsh.CreateShortcut($desktopLink1)
$sc2.TargetPath = 'wscript.exe'
$sc2.Arguments = '"${path.join(PROJECT_DIR, 'start-hidden.vbs').replace(/\\/g, '\\\\')}"'
$sc2.WorkingDirectory = '${PROJECT_DIR.replace(/\\/g, '\\\\')}'
$sc2.Description = 'Start VM Mobiles background service'
$sc2.IconLocation = 'shell32.dll,137'
$sc2.Save()

# 3. Desktop Shortcut - Stop VM Mobiles
$desktopLink2 = '${path.join(DESKTOP_DIR, 'Stop VM Mobiles.lnk').replace(/\\/g, '\\\\')}'
$sc3 = $wsh.CreateShortcut($desktopLink2)
$sc3.TargetPath = '${path.join(PROJECT_DIR, 'stop-service.bat').replace(/\\/g, '\\\\')}'
$sc3.WorkingDirectory = '${PROJECT_DIR.replace(/\\/g, '\\\\')}'
$sc3.Description = 'Stop VM Mobiles background service'
$sc3.IconLocation = 'shell32.dll,131'
$sc3.Save()

# 4. Desktop Shortcut - Check Status
$desktopLink3 = '${path.join(DESKTOP_DIR, 'Check VM Mobiles Status.lnk').replace(/\\/g, '\\\\')}'
$sc4 = $wsh.CreateShortcut($desktopLink3)
$sc4.TargetPath = '${path.join(PROJECT_DIR, 'CHECK_STATUS.bat').replace(/\\/g, '\\\\')}'
$sc4.WorkingDirectory = '${PROJECT_DIR.replace(/\\/g, '\\\\')}'
$sc4.Description = 'Check VM Mobiles Status and Open in Browser'
$sc4.IconLocation = 'shell32.dll,165'
$sc4.Save()

Write-Host "All shortcuts created successfully!"
`;

const psPath = path.join(PROJECT_DIR, 'scripts', 'setup-shortcuts.ps1');
fs.writeFileSync(psPath, psScript, 'utf8');

try {
  const out = execSync(`powershell.exe -ExecutionPolicy Bypass -File "${psPath}"`, { encoding: 'utf8' });
  console.log(out);
} catch (err) {
  console.error('Error running setup-shortcuts.ps1:', err.message);
}
