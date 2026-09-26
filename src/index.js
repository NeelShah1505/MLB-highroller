import { CFG } from './config.js';
import { BrowserManager } from './browser.js';
import { Storage } from './storage.js';
import { TelegramNotifier, formatNotification } from './telegram.js';

function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
function isLikelyOdds(s) {
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) && n >= 1.001 && n <= 1000;
}
function isLikelyTime(s) { return /\b\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM)?\b/i.test(s); }

function parseRow(raw) {
  const texts = raw.cells.map(x => norm(x.text));
  if (texts.length < 4) return null;
  if (texts.length >= 5) {
    const [event, user, time, odds, amount] = texts.slice(0, 5);
    return { event, user: user || 'Hidden', time, odds, amount, sport: raw.sport || '', rawText: raw.rowText };
  }
  const time = texts.find(isLikelyTime) || '';
  const odds = texts.find(isLikelyOdds) || '';
  const event = texts[0] || '';
  const amount = texts.find((x, i) => i > 0 && x !== odds && x !== time && /[$€£₹₽₺₴₦₱₫₩฿₮₲₵₡]/.test(x)) || texts.at(-1) || '';
  const user = texts.find(x => x !== event && x !== time && x !== odds && x !== amount) || 'Hidden';
  return { event, user, time, odds, amount, sport: raw.sport || '', rawText: raw.rowText };
}

// EXACT DETECTION LOGIC
function looksBaseball(r) {
  const hay = `${r.sport} ${r.rawText}`.toLowerCase();
  return r.sport.toLowerCase() === 'baseball' || hay.includes('baseball') || hay.includes('mlb');
}

function looksPlayerProp(r) {
  if (!looksBaseball(r)) return false;
  if (!CFG.playerPropsOnly) return true;
  const e = norm(r.event);
  if (!e || /^multi\b/i.test(e)) return false;
  if (/\s[-–—]\s/.test(e)) return false;
  return true;
}

function makeId(r) { return [r.event, r.user, r.time, r.odds, r.amount].map(norm).join(' | '); }

async function main() {
  console.log('='.repeat(62));
  console.log(' ⚾ MLB High Roller Watcher (v2.0 Production Ready)');
  console.log('='.repeat(62));
  console.log(`URL: ${CFG.url}`);
  console.log(`Poll interval: ${CFG.pollMs}ms | Player props only: ${CFG.playerPropsOnly ? 'yes' : 'no'}`);
  console.log(`Target CDP: ${CFG.cdpUrl || 'Headless Playwright'}`);

  const storage = new Storage(CFG.logFile);
  const seen = storage.loadSeen();
  console.log(`Storage loaded: ${seen.size} existing bet signatures from ${CFG.logFile}`);

  const notifier = new TelegramNotifier(CFG.botToken, CFG.chatId);
  if (notifier.enabled) {
    const verified = await notifier.verify();
    console.log(`Telegram Bot: ${verified ? '✅ Verified & Ready' : '⚠️ Token provided but getMe check failed'}`);
  } else {
    console.log('Telegram Bot: ❌ Not configured (check .env)');
  }

  const browserManager = new BrowserManager(CFG);
  let pollCount = 0;
  let matchesCount = 0;
  let lastHeartbeat = Date.now();

  async function ensureConnected() {
    let delay = 2000;
    while (true) {
      try {
        await browserManager.connect();
        console.log(browserManager.attached ? '✅ Attached to Chrome session.' : 'Started a Playwright browser.');
        return;
      } catch (err) {
        console.error(`[CDP] Connection failed: ${err.message}. Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 1.5, 15000);
      }
    }
  }

  await ensureConnected();
  await new Promise(r => setTimeout(r, 2000));

  let initialized = false;

  while (true) {
    try {
      const rawRows = await browserManager.extractRows();
      const parsed = rawRows.map(parseRow).filter(Boolean);
      const matches = parsed.filter(looksPlayerProp);
      pollCount++;

      if (!initialized) {
        for (const r of matches) {
          const id = makeId(r);
          if (id) seen.set(id, Date.now());
        }
        initialized = true;
        console.log(`Initial sync complete: ${matches.length} active candidate rows seeded.`);
      } else {
        for (const r of matches) {
          const id = makeId(r);
          if (!id || seen.has(id)) continue;

          seen.set(id, Date.now());
          matchesCount++;
          storage.append({ ...r, id });

          const msg = formatNotification(r);
          console.log(`\n🚨 NEW MLB BET DETECTED!\n${msg}\n`);
          await notifier.send(msg);
        }
      }

      storage.prune(seen);

      // Heartbeat every 60 seconds
      if (Date.now() - lastHeartbeat >= 60000) {
        const timeStr = new Date().toLocaleTimeString();
        console.log(`[${timeStr}] 💓 Heartbeat: ${pollCount} polls | ${matchesCount} alerts dispatched | ${seen.size} cached bets`);
        lastHeartbeat = Date.now();
      }
    } catch (e) {
      console.error(`[WATCHER ERROR] ${new Date().toLocaleTimeString()}: ${e.message}`);
      await browserManager.disconnect();
      await ensureConnected();
      await new Promise(r => setTimeout(r, 3000));
    }

    await new Promise(r => setTimeout(r, CFG.pollMs));
  }
}

process.on('SIGINT', () => { console.log('\nShutting down cleanly...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\nTerminating cleanly...'); process.exit(0); });
main().catch(err => { console.error('Fatal crash:', err); process.exit(1); });
