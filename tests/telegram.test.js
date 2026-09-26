import assert from 'node:assert/strict';
import test from 'node:test';
import { formatNotification } from '../src/telegram.js';

test('formatNotification formats MLB prop clearly with clean markdown', () => {
  const bet = {
    event: 'Aaron Judge - Home Run',
    odds: '3.10',
    amount: '$15,000.00',
    user: 'HighRoller77',
    time: '4:15 PM',
  };
  const text = formatNotification(bet);
  assert.ok(text.includes('⚾ *MLB Player Prop Alert*'));
  assert.ok(text.includes('Aaron Judge - Home Run'));
  assert.ok(text.includes('$15,000.00'));
});

test('formatNotification formats Pro Wrestling / Specials bet clearly', () => {
  const bet = {
    event: 'Roman Reigns - Money in the Bank 2026',
    odds: '1.10',
    amount: '$25,000.00',
    user: 'Hidden',
    time: '5:30 PM',
    category: 'wrestling',
  };
  const text = formatNotification(bet, 'wrestling');
  assert.ok(text.includes('🤼 *Specials / Pro Wrestling Bet Alert*'));
  assert.ok(text.includes('Roman Reigns'));
  assert.ok(text.includes('1.10'));
});

