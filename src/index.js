import { CFG } from './config.js';
import { BrowserManager } from './browser.js';
import { Storage } from './storage.js';
import { TelegramNotifier, formatNotification } from './telegram.js';
import { classifyBet, formatSportName, parseUsdAmount, parseOdds } from './filter.js';

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
  const sportName = formatSportName(raw.sport, raw.icons || [], event);

  return {
    rowIndex: raw.rowIndex,
    sportName,
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
  console.log(' 👑 Stake High Roller Watcher (Tennis Testing Mode Active)');
  console.log('='.repeat(62));
  console.log(`Watching ${CFG.url}`);
  console.log(`Poll: ${CFG.pollMs}ms | Preview details: ${CFG.previewDetails ? 'yes' : 'no'}`);
  console.log(`Telegram: ${CFG.telegramEnabled ? 'enabled' : 'disabled'}`);
  console.log('Active Notification Rules:');
  console.log('  1. 🎾 TENNIS: ALL bets (Testing Mode - any stake & odds)');
  console.log('  2. 🤼 PRO WRESTLING: ALL bets (any stake & odds)');
  console.log('  3. 🚨 ALL OTHER SPORTS: Stake > $199,000 AND Decimal Odds > 1.50');
  console.log('='.repeat(62));

  const storage = new Storage(CFG.logFile);
  const seen = storage.loadSeen();
  const debugSeen = new Map();
  console.log(`[INFO] Storage loaded: ${seen.size} existing bet signatures from ${CFG.logFile}`);

  const notifier = new TelegramNotifier(CFG.botToken, CFG.chatId, CFG.telegramEnabled);
  if (notifier.enabled) {
    const verified = await notifier.verify();
    console.log(`Telegram Bot: ${verified ? '✅ Verified & Ready' : '⚠️ Token provided but getMe check failed'}`);
    if (verified) {
      await notifier.send(
        `🎾 *Stake High Roller Watcher (Tennis Testing Active)*\n\n` +
        `📡 *Feed:* \`${CFG.url}\`\n` +
        `⏱ *Polling:* \`${CFG.pollMs}ms\`\n` +
        `📋 *Rules Active:*\n` +
        `  • *🎾 Tennis:* ALL bets (Testing Mode - any stake & odds)\n` +
        `  • *🤼 Pro Wrestling:* ALL bets (any stake & odds)\n` +
        `  • *🚨 All Other Sports:* Stake > $199k & Odds > 1.50\n\n` +
        `✅ Monitoring 24/7 on VPS.`
      ).catch(() => {});
    }
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
  let emptyPolls = 0;

  while (true) {
    try {
      if (browserManager.page && !browserManager.page.url().includes('/sports/high')) {
        console.warn(`[WARN] Page navigated away to ${browserManager.page.url()}. Returning to ${CFG.url}...`);
        await browserManager.page.goto(CFG.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      }

      const rawRows = await browserManager.extractRows();
      if (!rawRows || rawRows.length === 0) {
        emptyPolls++;
        if (emptyPolls >= 15) {
          console.warn('[WARN] No table rows detected for 15 seconds. Reloading Stake page...');
          if (browserManager.page) {
            await browserManager.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
          }
          emptyPolls = 0;
        }
      } else {
        emptyPolls = 0;
      }

      const parsed = rawRows.map(parseRow).filter(Boolean);
      const matches = parsed.map(r => {
        const res = classifyBet(r, CFG);
        return res.isMatch ? { ...r, category: res.category, rule: res.rule } : null;
      }).filter(Boolean);
      pollCount++;

      if (!initialized) {
        for (const r of matches) {
          const fp = makeFingerprint(r);
          if (fp) seen.set(fp, Date.now());
        }
        initialized = true;
        console.log(`[]`);
        console.log(`Current qualifying rows: ${matches.length}`);
        console.log(`Initial sync complete: ${matches.length} existing qualifying rows seeded.`);
        console.log(`[INFO] Watcher started — live monitoring on ${CFG.pollMs}ms polling.`);
      } else {
        if (CFG.debug) {
          for (const r of parsed) {
            const fp = makeFingerprint(r);
            if (!debugSeen.has(fp)) {
              debugSeen.set(fp, Date.now());
              const res = classifyBet(r, CFG);
              if (!res.isMatch) {
                const usd = parseUsdAmount(r.amount);
                const odds = parseOdds(r.odds);
                let reason = '';
                if (usd <= 199000 && odds <= 1.50) reason = `Stake ($${Math.round(usd).toLocaleString()}) <= $199k & Odds (${odds}) <= 1.50`;
                else if (usd <= 199000) reason = `Stake ($${Math.round(usd).toLocaleString()}) <= $199k`;
                else if (odds <= 1.50) reason = `Odds (${odds}) <= 1.50`;
                console.log(`[DEBUG] Row seen: [${r.sportName}] ${r.event} | ${r.user} | ${r.amount} @ ${r.odds} -> ❌ Skipped (${reason})`);
              }
            }
          }
          storage.prune(debugSeen);
        }

        for (const r of matches) {
          const fp = makeFingerprint(r);
          if (!fp || seen.has(fp)) continue;

          // Attempt modal extraction for Selection, Event, Market, Bet ID, Time & Payout
          if (CFG.previewDetails && typeof r.rowIndex === 'number') {
            const details = await browserManager.fetchRowDetails(r.rowIndex);
            if (details) {
              if (details.betId) r.betId = details.betId;
              if (details.payout) r.payout = details.payout;
              if (details.selection) r.selection = details.selection;
              if (details.event) r.event = details.event;
              if (details.market) r.market = details.market;
              if (details.time) r.time = details.time;
              if (details.user && (!r.user || r.user === 'Hidden')) r.user = details.user;
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

          console.log(`\n[INFO] New Qualifying Bet Detected [${r.rule}]`);
          console.log(`  1️⃣ Sport:     ${r.sportName}`);
          console.log(`  2️⃣ Username:  ${r.user}`);
          console.log(`  3️⃣ Selection: ${r.selection || r.event}`);
          console.log(`  4️⃣ Event:     ${r.event}`);
          console.log(`  5️⃣ Market:    ${r.market || 'Match / Outright'}`);
          console.log(`  6️⃣ Stake:     ${r.amount}`);
          console.log(`  7️⃣ Odds:      ${r.odds}`);
          console.log(`  8️⃣ Time:      ${r.time}`);
          if (r.betId) console.log(`  🆔 Bet ID:    ${r.betId}`);
          if (r.payout) console.log(`  💵 Payout:    ${r.payout}`);

          const msg = formatNotification(r, r.category);
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
