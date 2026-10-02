import { CFG } from './config.js';
import { BrowserManager } from './browser.js';
import { Storage } from './storage.js';
import { TelegramNotifier, formatNotification } from './telegram.js';
import { classifyBet } from './filter.js';

function norm(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function isLikelyOdds(s) {
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) && n >= 1.001 && n <= 1000;
}

function isLikelyTime(s) {
  return /\b\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM)?\b/i.test(s);
}

function parseRow(raw) {
  const texts = raw.cells.map(x => norm(x.text));
  if (texts.length < 4) return null;
  let event, user, time, odds, amount;
  if (texts.length >= 5) {
    [event, user, time, odds, amount] = texts.slice(0, 5);
  } else {
    time = texts.find(isLikelyTime) || '';
    odds = texts.find(isLikelyOdds) || '';
    event = texts[0] || '';
    amount = texts.find((x, i) => i > 0 && x !== odds && x !== time && /[$€£₹₽₺₴₦₱₫₩฿₮₲₵₡]/.test(x)) || texts.at(-1) || '';
    user = texts.find(x => x !== event && x !== time && x !== odds && x !== amount) || 'Hidden';
  }
  return {
    rowIndex: raw.rowIndex,
    event,
    user: user || 'Hidden',
    time,
    odds,
    amount,
    sport: raw.sport || '',
    icons: raw.icons || [],
    rawText: raw.rowText,
  };
}

function makeFingerprint(r) {
  return [r.event, r.user, r.time, r.odds, r.amount].map(norm).join(' | ');
}

async function main() {
  console.log('='.repeat(62));
  console.log(' 🎾 Stake High Roller — Tennis Watcher');
  console.log('='.repeat(62));
  console.log(`Watching ${CFG.url}`);
  console.log(`Poll: ${CFG.pollMs}ms | Target: ${CFG.targetSport.toUpperCase()} | Preview Details: ${CFG.previewDetails ? 'enabled' : 'disabled'}`);
  console.log(`Telegram: ${CFG.telegramEnabled ? 'enabled' : 'disabled'}`);

  const storage = new Storage(CFG.logFile);
  const seen = storage.loadSeen();
  console.log(`[INFO] Storage loaded: ${seen.size} existing bet signatures from ${CFG.logFile}`);

  const notifier = new TelegramNotifier(CFG.botToken, CFG.chatId, CFG.telegramEnabled);
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
        console.log(`[INFO] Connecting to Chrome session at ${CFG.cdpUrl}...`);
        await browserManager.connect();
        console.log(`[INFO] Chrome connected.`);
        console.log(`[INFO] Stake page loaded: ${CFG.url}`);
        return;
      } catch (err) {
        console.warn(`[WARN] CDP connection failed: ${err.message}`);
        console.log(`[INFO] Reconnecting in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 1.5, 15000);
      }
    }
  }

  await ensureConnected();
  await new Promise(r => setTimeout(r, 1500));

  let initialized = false;

  while (true) {
    try {
      const rawRows = await browserManager.extractRows();
      const parsed = rawRows.map(parseRow).filter(Boolean);
      const matches = parsed.map(r => {
        const res = classifyBet(r, CFG);
        return res.isMatch ? { ...r, category: res.category } : null;
      }).filter(Boolean);
      pollCount++;

      if (!initialized) {
        for (const r of matches) {
          const fp = makeFingerprint(r);
          if (fp) seen.set(fp, Date.now());
        }
        initialized = true;
        console.log(`[INFO] Current tennis rows: ${matches.length}`);
        console.log(`[INFO] Initial sync complete: ${matches.length} existing tennis rows seeded.`);
        console.log(`[INFO] Tennis watcher started.`);
      } else {
        for (const r of matches) {
          const fp = makeFingerprint(r);
          if (!fp || seen.has(fp)) continue;

          // Attempt modal extraction for Bet ID & Payout if preview details is enabled
          if (CFG.previewDetails && typeof r.rowIndex === 'number') {
            const details = await browserManager.fetchRowDetails(r.rowIndex);
            if (details) {
              if (details.betId) r.betId = details.betId;
              if (details.payout) r.payout = details.payout;
            }
          }

          // If Bet ID is extracted and was already seen in past runs, skip
          if (r.betId && seen.has(String(r.betId).trim())) {
            seen.set(fp, Date.now());
            continue;
          }

          const canonicalId = r.betId ? String(r.betId).trim() : fp;
          seen.set(fp, Date.now());
          if (r.betId) seen.set(canonicalId, Date.now());

          matchesCount++;
          storage.append({ ...r, id: canonicalId });

          console.log(`\n[INFO] New tennis bet detected`);
          console.log(`  🎾 Event:  ${r.event}`);
          console.log(`  👤 User:   ${r.user}`);
          console.log(`  💰 Amount: ${r.amount}`);
          console.log(`  📈 Odds:   ${r.odds}`);
          console.log(`  🕐 Time:   ${r.time}`);
          if (r.betId) console.log(`  🆔 Bet ID: ${r.betId}`);
          if (r.payout) console.log(`  💵 Payout: ${r.payout}`);

          const msg = formatNotification(r, 'tennis');
          await notifier.send(msg);
          console.log(`[INFO] Telegram notification sent\n`);
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
      console.warn(`[WARN] Stake page unavailable / error: ${e.message}`);
      console.warn(`[WARN] CDP connection lost`);
      await browserManager.disconnect();
      await ensureConnected();
      await new Promise(r => setTimeout(r, 2000));
    }

    await new Promise(r => setTimeout(r, CFG.pollMs));
  }
}

process.on('SIGINT', () => { console.log('\n[INFO] Shutting down cleanly...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n[INFO] Terminating cleanly...'); process.exit(0); });
main().catch(err => { console.error('Fatal crash:', err); process.exit(1); });
