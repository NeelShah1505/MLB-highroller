import { spawn, execSync } from 'node:child_process';
import process from 'node:process';

console.log('[CHROME DAEMON] Initializing Xvfb virtual display and Chrome on port 9222...');

// 1. Clean up old locks and kill ONLY exact binary names google-chrome and Xvfb
try {
  execSync('killall -9 google-chrome chrome-sandbox Xvfb 2>/dev/null || true');
  execSync('rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true');
} catch {}

// 2. Launch Xvfb
console.log('[CHROME DAEMON] Spawning Xvfb on display :99...');
const xvfb = spawn('Xvfb', [':99', '-screen', '0', '1920x1080x24', '-ac'], {
  stdio: 'inherit',
});

xvfb.on('error', (err) => {
  console.error('[CHROME DAEMON] Xvfb error:', err);
});

let chromeProcess = null;

// 3. Launch Google Chrome after a short delay for Xvfb
setTimeout(() => {
  console.log('[CHROME DAEMON] Launching Google Chrome with CDP on port 9222...');

  const env = { ...process.env, DISPLAY: ':99' };
  chromeProcess = spawn('google-chrome', [
    '--remote-debugging-port=9222',
    '--user-data-dir=/root/.stake-chrome',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--window-size=1920,1080',
    'https://stake.jp/sports/high/all'
  ], {
    env,
    stdio: 'inherit'
  });

  chromeProcess.on('error', (err) => {
    console.error('[CHROME DAEMON] Failed to start Chrome:', err);
    process.exit(1);
  });

  chromeProcess.on('exit', (code, signal) => {
    console.warn(`[CHROME DAEMON] Chrome exited (code=${code}, signal=${signal}). PM2 will restart.`);
    process.exit(code || 1);
  });
}, 1500);

function cleanup() {
  try {
    if (chromeProcess) chromeProcess.kill('SIGKILL');
    if (xvfb) xvfb.kill('SIGKILL');
    execSync('killall -9 google-chrome Xvfb 2>/dev/null || true');
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
