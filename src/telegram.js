export function formatNotification(r, category = 'highroller') {
  const liveTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  }).format(new Date());

  const isTennis = category === 'tennis' || r.category === 'tennis';
  const isWrestling = category === 'wrestling' || r.category === 'wrestling';
  
  let header = '🚨 *HIGH ROLLER BET ALERT* (Stake > $199K & Odds > 1.50)';
  if (isTennis) {
    header = '🎾 *TENNIS HIGH ROLLER ALERT* (Testing Mode)';
  } else if (isWrestling) {
    header = '🤼 *PRO WRESTLING BET ALERT*';
  }

  const sportName = isTennis ? 'Tennis' : (isWrestling ? 'Pro Wrestling' : (r.sportName || r.sport || 'Sports'));
  const user = r.user || 'Hidden';
  const selection = r.selection || r.event || '—';
  const event = r.event || r.selection || '—';
  const market = r.market || (isWrestling ? 'Championship / Outright' : 'Match Winner');
  const stake = r.amount || '—';
  const odds = r.odds || '—';
  const time = r.time || '—';

  const lines = [
    header,
    '',
    `1️⃣ *Sport/Type:* \`${sportName}\``,
    `2️⃣ *Username:* \`${user}\``,
    `3️⃣ *Selection:* \`${selection}\``,
    `4️⃣ *Event:* \`${event}\``,
    `5️⃣ *Market:* \`${market}\``,
    `6️⃣ *Stake:* \`${stake}\``,
    `7️⃣ *Odds:* \`${odds}\``,
    `8️⃣ *Time:* \`${time}\``,
    `⚡ *Live Detected:* \`${liveTime} IST\``,
  ];

  if (r.payout) {
    lines.push(`💵 *Payout:* \`${r.payout}\``);
  }
  if (r.betId) {
    lines.push(`🆔 *Bet ID:* \`${r.betId}\``);
  }

  return lines.join('\n');
}

export class TelegramNotifier {
  constructor(botToken, chatId, enabled = true) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.enabled = Boolean(enabled && botToken && chatId);
  }

  async verify() {
    if (!this.enabled) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
      const data = await res.json();
      return data.ok === true;
    } catch {
      return false;
    }
  }

  async send(text, parseMode = 'Markdown', retries = 3) {
    if (!this.enabled) return;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            parse_mode: parseMode,
            disable_web_page_preview: true,
          }),
        });

        if (res.status === 429) {
          const body = await res.json().catch(() => ({}));
          const waitSec = (body.parameters && body.parameters.retry_after) || 2;
          console.warn(`[TELEGRAM] Rate limited. Waiting ${waitSec}s...`);
          await new Promise(r => setTimeout(r, waitSec * 1000));
          continue;
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }

        return;
      } catch (err) {
        if (attempt === retries) {
          console.error(`[TELEGRAM] Failed after ${retries} attempts: ${err.message}`);
        } else {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
  }
}
