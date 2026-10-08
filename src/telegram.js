/**
 * Escape HTML special characters for Telegram HTML parse mode.
 * Only <, >, & need escaping in Telegram's HTML subset.
 */
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

  let header = '🚨 <b>HIGH ROLLER BET ALERT</b> (Stake &gt; $199K &amp; Odds &gt; 1.50)';
  if (isTennis) {
    header = '🎾 <b>TENNIS HIGH ROLLER ALERT</b> (Testing Mode)';
  } else if (isWrestling) {
    header = '🤼 <b>PRO WRESTLING BET ALERT</b>';
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
    `1️⃣ <b>Sport/Type:</b> <code>${escHtml(sportName)}</code>`,
    `2️⃣ <b>Username:</b> <code>${escHtml(user)}</code>`,
    `3️⃣ <b>Selection:</b> <code>${escHtml(selection)}</code>`,
    `4️⃣ <b>Event:</b> <code>${escHtml(event)}</code>`,
    `5️⃣ <b>Market:</b> <code>${escHtml(market)}</code>`,
    `6️⃣ <b>Stake:</b> <code>${escHtml(stake)}</code>`,
    `7️⃣ <b>Odds:</b> <code>${escHtml(odds)}</code>`,
    `8️⃣ <b>Time:</b> <code>${escHtml(time)}</code>`,
    `⚡ <b>Live Detected:</b> <code>${escHtml(liveTime)} IST</code>`,
  ];

  if (r.payout) {
    lines.push(`💵 <b>Payout:</b> <code>${escHtml(r.payout)}</code>`);
  }
  if (r.betId) {
    lines.push(`🆔 <b>Bet ID:</b> <code>${escHtml(r.betId)}</code>`);
  }

  return lines.join('\n');
}

export class TelegramNotifier {
  constructor(botToken, chatId, enabled = true) {
    this.botToken = (botToken || '').trim();
    const rawIds = Array.isArray(chatId) ? chatId : String(chatId || '').split(',');
    this.chatIds = rawIds.map(id => String(id).trim()).filter(Boolean);
    this.chatId = this.chatIds[0] || '';
    this.enabled = Boolean(enabled && this.botToken && this.chatIds.length > 0);
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

  async send(text, parseMode = 'HTML', retries = 3) {
    if (!this.enabled) {
      console.log('[TELEGRAM] ⚠️ Notifications disabled — skipping send.');
      return false;
    }

    let anySuccess = false;
    for (const targetChatId of this.chatIds) {
      const sent = await this._sendToChat(targetChatId, text, parseMode, retries);
      if (sent) anySuccess = true;
    }
    return anySuccess;
  }

  async _sendToChat(targetChatId, text, parseMode = 'HTML', retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const body = {
          chat_id: targetChatId,
          text,
          disable_web_page_preview: true,
        };
        if (parseMode) body.parse_mode = parseMode;

        const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });

        const responseData = await res.json().catch(() => ({}));

        if (res.status === 429) {
          const waitSec = (responseData.parameters && responseData.parameters.retry_after) || 2;
          console.log(`[TELEGRAM] ⏳ Rate limited on ${targetChatId}. Waiting ${waitSec}s... (attempt ${attempt}/${retries})`);
          await new Promise(r => setTimeout(r, waitSec * 1000));
          continue;
        }

        if (res.ok && responseData.ok) {
          const msgId = responseData.result && responseData.result.message_id;
          console.log(`[TELEGRAM] ✅ Message sent to ${targetChatId}! (message_id: ${msgId})`);
          return true;
        }

        // Non-OK response — log details
        console.log(`[TELEGRAM] ❌ API error for ${targetChatId}: HTTP ${res.status} — ${responseData.description || JSON.stringify(responseData)}`);

        // If formatting failed (400), retry immediately as plain text (no parse_mode)
        if (res.status === 400 && parseMode) {
          console.log(`[TELEGRAM] 🔄 Retrying as plain text on ${targetChatId}...`);
          const plainBody = {
            chat_id: targetChatId,
            text: text.replace(/<[^>]+>/g, ''), // Strip HTML tags for plain text
            disable_web_page_preview: true,
          };
          const plainRes = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(plainBody),
          });
          const plainData = await plainRes.json().catch(() => ({}));
          if (plainRes.ok && plainData.ok) {
            const msgId = plainData.result && plainData.result.message_id;
            console.log(`[TELEGRAM] ✅ Plain text fallback sent to ${targetChatId}! (message_id: ${msgId})`);
            return true;
          }
          console.log(`[TELEGRAM] ❌ Plain text fallback failed for ${targetChatId}: HTTP ${plainRes.status} — ${plainData.description || JSON.stringify(plainData)}`);
        }

        // Don't retry on 4xx errors other than 429 (they won't succeed)
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          console.log(`[TELEGRAM] 🛑 Client error ${res.status} for ${targetChatId} — not retrying.`);
          return false;
        }

        throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        if (attempt === retries) {
          console.log(`[TELEGRAM] ❌ FAILED for ${targetChatId} after ${retries} attempts: ${err.message}`);
          return false;
        } else {
          console.log(`[TELEGRAM] ⚠️ Attempt ${attempt}/${retries} failed for ${targetChatId}: ${err.message}. Retrying in ${attempt}s...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    return false;
  }
}
