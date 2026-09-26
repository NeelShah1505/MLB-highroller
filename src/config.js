import 'dotenv/config';

export function loadConfig(env = process.env) {
  return {
    url: (env.STAKE_URL || 'https://stake.jp/sports/high/all').trim(),
    pollMs: Math.max(500, Number(env.POLL_MS || 2000)),
    botToken: (env.TELEGRAM_BOT_TOKEN || '').trim(),
    chatId: (env.TELEGRAM_CHAT_ID || '').trim(),
    logFile: (env.LOG_FILE || 'data/bets.jsonl').trim(),
    cdpUrl: (env.CDP_URL || 'http://127.0.0.1:9222').trim(),
    debug: String(env.DEBUG || 'false').toLowerCase() === 'true',
    playerPropsOnly: String(env.PLAYER_PROPS_ONLY || 'true').toLowerCase() === 'true',
  };
}

export const CFG = loadConfig();
