import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';

test('loadConfig provides sanitized defaults and trims inputs', () => {
  const cfg = loadConfig({
    TELEGRAM_BOT_TOKEN: ' 12345:token ',
    TELEGRAM_CHAT_ID: ' 5167354900 ',
    POLL_MS: '3000',
    PLAYER_PROPS_ONLY: 'true',
  });
  assert.equal(cfg.botToken, '12345:token');
  assert.equal(cfg.chatId, '5167354900');
  assert.equal(cfg.pollMs, 3000);
  assert.equal(cfg.playerPropsOnly, true);
  assert.equal(cfg.cdpUrl, 'http://127.0.0.1:9222');
});
