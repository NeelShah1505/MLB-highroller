import assert from 'node:assert/strict';
import test from 'node:test';
import { formatNotification, TelegramNotifier } from '../src/telegram.js';

test('formatNotification formats Tennis high roller clearly with clean markdown', () => {
  const bet = {
    event: 'Valentin Royer',
    odds: '2.15',
    amount: '₹67,425.00',
    user: 'Hidden',
    time: '10:24 AM',
    betId: '661868490',
    category: 'tennis',
  };
  const text = formatNotification(bet, 'tennis');
  assert.ok(text.includes('🎾 *TENNIS HIGH ROLLER*'));
  assert.ok(text.includes('Valentin Royer'));
  assert.ok(text.includes('₹67,425.00'));
  assert.ok(text.includes('2.15'));
  assert.ok(text.includes('661868490'));
});

test('TelegramNotifier respects enabled flag', () => {
  const disabledNotifier = new TelegramNotifier('token', 'chatId', false);
  assert.equal(disabledNotifier.enabled, false);

  const enabledNotifier = new TelegramNotifier('token', 'chatId', true);
  assert.equal(enabledNotifier.enabled, true);
});
