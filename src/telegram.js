export function formatNotification(r, category = 'tennis') {
  if (category === 'tennis' || r.category === 'tennis') {
    const lines = [
      '🎾 *TENNIS HIGH ROLLER*',
      '',
      `👤 *User:* \`${r.user || 'Hidden'}\``,
      `🎾 *Event:* \`${r.event || '—'}\``,
      `💰 *Amount:* \`${r.amount || '—'}\``,
      `📈 *Odds:* \`${r.odds || '—'}\``,
      `🕐 *Time:* \`${r.time || '—'}\``,
    ];

    if (r.market && r.market !== r.event) {
      lines.push(`🎯 *Market:* \`${r.market}\``);
    }
    if (r.payout) {
      lines.push(`💵 *Payout:* \`${r.payout}\``);
    }
    if (r.betId) {
      lines.push(`🆔 *Bet ID:* \`${r.betId}\``);
    }

    return lines.join('\n');
  }

  if (category === 'wrestling' || r.category === 'wrestling') {
    return [
      '🤼 *Specials / Pro Wrestling Bet Alert*',
      `*Selection / Event:* \`${r.event || '—'}\``,
      `*Odds:* \`${r.odds || '—'}\``,
      `*Amount:* \`${r.amount || '—'}\``,
      `*User:* \`${r.user || 'Hidden'}\``,
      `*Time:* \`${r.time || '—'}\``,
      `*Category:* \`Specials (Pro Wrestling)\``,
    ].join('\n');
  }

  return [
    '⚾ *MLB Player Prop Alert*',
    `*Player / Market:* \`${r.event || '—'}\``,
    `*Odds:* \`${r.odds || '—'}\``,
    `*Amount:* \`${r.amount || '—'}\``,
    `*User:* \`${r.user || 'Hidden'}\``,
    `*Time:* \`${r.time || '—'}\``,
  ].join('\n');
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
