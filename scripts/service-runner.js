const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const URL_FILE = path.join(ROOT_DIR, 'ONLINE_URL.txt');
const LOG_FILE = path.join(ROOT_DIR, 'service.log');
const CLOUDFLARED_BIN = path.join(ROOT_DIR, 'cloudflared.exe');
const DESKTOP_DIR = path.join('C:', 'Users', 'vicra', 'OneDrive', 'Desktop');

let nextProcess = null;
let tunnelProcess = null;
let currentPublicUrl = null;
let isShuttingDown = false;
let serverSpawnedByUs = false;

function log(msg) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  try {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 2 * 1024 * 1024) {
      fs.writeFileSync(LOG_FILE, `[${timestamp}] Log rotated.\n`, 'utf8');
    }
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (e) {}
}

function checkPort3000() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3000', { timeout: 3000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const ok = await checkPort3000();
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function ensureNextServer() {
  if (isShuttingDown) return;

  const alreadyRunning = await checkPort3000();
  if (alreadyRunning) {
    log('Next.js server is already running on port 3000. Reusing active instance.');
    return;
  }

  log('Starting Next.js production server on 0.0.0.0:3000 (IPv4)...');
  serverSpawnedByUs = true;

  nextProcess = spawn('cmd.exe', ['/c', 'npx next start -H 0.0.0.0 -p 3000'], {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  nextProcess.stdout.on('data', (d) => {
    const text = d.toString().trim();
    if (text) log(`[Next.js] ${text}`);
  });

  nextProcess.stderr.on('data', (d) => {
    const text = d.toString().trim();
    if (text && !text.includes('ExperimentalWarning')) {
      log(`[Next.js ERR] ${text}`);
    }
  });

  nextProcess.on('error', (err) => {
    log(`[Next.js Process Error] ${err.message}`);
  });

  nextProcess.on('close', (code) => {
    log(`Next.js process exited with code ${code}.`);
    nextProcess = null;
    if (!isShuttingDown) {
      log('Will check and restart Next.js in 5 seconds...');
      setTimeout(ensureNextServer, 5000);
    }
  });
}

function writeUrlShortcuts(publicUrl) {
  const content = `============================================================
              VN MOBILES - ONLINE STORE
============================================================
Status:            ONLINE (24/7 Background Service)
Public Web Link:   ${publicUrl}
Local Link:        http://localhost:3000
Local Wi-Fi Link:  http://10.1.7.122:3000
Last Updated:      ${new Date().toLocaleString()}
============================================================
Share the Public Web Link with anyone on any phone, laptop,
or tablet anywhere in the world to browse and buy mobiles!
============================================================
`;

  try {
    fs.writeFileSync(URL_FILE, content, 'utf8');
  } catch (e) {
    log(`Failed to write ONLINE_URL.txt: ${e.message}`);
  }

  // Store all access shortcuts cleanly inside Z:\Web_Site\Shortcuts
  const shortcutsDir = path.join(ROOT_DIR, 'Shortcuts');
  try {
    if (!fs.existsSync(shortcutsDir)) {
      fs.mkdirSync(shortcutsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(shortcutsDir, 'VM_MOBILES_LINK.txt'), content, 'utf8');
    fs.writeFileSync(path.join(shortcutsDir, 'VM Mobiles Local (Instant 0ms).url'), `[InternetShortcut]\nURL=http://127.0.0.1:3000\nIconIndex=0\n`, 'utf8');
    fs.writeFileSync(path.join(shortcutsDir, 'VM Mobiles Online.url'), `[InternetShortcut]\nURL=${publicUrl}\nIconIndex=0\n`, 'utf8');
    fs.writeFileSync(path.join(shortcutsDir, 'VM Mobiles Admin Portal.url'), `[InternetShortcut]\nURL=http://127.0.0.1:3000/admin\nIconIndex=0\n`, 'utf8');
    fs.writeFileSync(path.join(shortcutsDir, 'VM Mobiles User Portal.url'), `[InternetShortcut]\nURL=http://127.0.0.1:3000/user\nIconIndex=0\n`, 'utf8');

    log('Updated shortcuts in Z:\\Web_Site\\Shortcuts folder.');
  } catch (e) {
    log(`Failed to write shortcuts in Z:\\Web_Site\\Shortcuts: ${e.message}`);
  }
}

function startTunnel() {
  if (isShuttingDown) return;
  log('Starting Cloudflare Tunnel (http2 protocol)...');

  tunnelProcess = spawn(
    CLOUDFLARED_BIN,
    ['tunnel', '--protocol', 'http2', '--url', 'http://127.0.0.1:3000'],
    {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }
  );

  function processTunnelOutput(data) {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const detectedUrl = match[0];
      if (detectedUrl !== currentPublicUrl) {
        currentPublicUrl = detectedUrl;
        log('================================================================');
        log(`>>> PUBLIC INTERNET URL: ${currentPublicUrl} <<<`);
        log('================================================================');
        writeUrlShortcuts(currentPublicUrl);
      }
    }
    if (text.includes('Registered tunnel connection') || text.includes('INF')) {
      const lines = text.trim().split('\n');
      for (const line of lines) {
        if (line.includes('Registered tunnel connection') || line.includes('quick Tunnel has been created')) {
          log(`[Tunnel] ${line.trim()}`);
        }
      }
    }
  }

  tunnelProcess.stdout.on('data', processTunnelOutput);
  tunnelProcess.stderr.on('data', processTunnelOutput);

  tunnelProcess.on('error', (err) => {
    log(`[Cloudflare Tunnel Error] ${err.message}`);
  });

  tunnelProcess.on('close', (code) => {
    log(`Tunnel process exited with code ${code}.`);
    tunnelProcess = null;
    if (!isShuttingDown) {
      log('Reconnecting Cloudflare tunnel in 4 seconds...');
      setTimeout(startTunnel, 4000);
    }
  });
}

function startHeartbeat() {
  setInterval(async () => {
    if (isShuttingDown) return;
    const ok = await checkPort3000();
    if (!ok) {
      log('Heartbeat: Port 3000 is not responding! Attempting restart...');
      ensureNextServer();
    }
  }, 20000);
}

async function main() {
  log('================================================================');
  log('   VM Mobiles Standalone Background Service Starting');
  log('================================================================');

  await ensureNextServer();

  log('Waiting for Next.js to be ready at http://127.0.0.1:3000 ...');
  const ready = await waitForServer(30);
  if (ready) {
    log('Next.js server is confirmed HEALTHY and responding on port 3000.');
  } else {
    log('Warning: Server taking longer to respond, launching tunnel anyway...');
  }

  startTunnel();
  startHeartbeat();
}

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log('Stopping VM Mobiles background service...');
  if (tunnelProcess) {
    try { tunnelProcess.kill('SIGKILL'); } catch (e) {}
  }
  if (nextProcess && serverSpawnedByUs) {
    try { nextProcess.kill('SIGKILL'); } catch (e) {}
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (err) => {
  log(`[CRITICAL WARNING] Uncaught exception prevented: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  log(`[CRITICAL WARNING] Unhandled rejection prevented: ${reason}`);
});

main();
