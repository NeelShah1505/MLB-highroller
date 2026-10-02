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

test('formatNotification formats Pro Wrestling high roller matching handoff specifications', () => {
  const bet = {
    selection: 'Roman Reigns',
    event: 'Money in the Bank 2026',
    market: 'World Heavyweight Championship',
    odds: '1.10',
    amount: '₹100,000.00',
    user: 'Hidden',
    time: '7:14 PM',
    betId: '881923145',
    category: 'wrestling',
  };
  const text = formatNotification(bet, 'wrestling');
  assert.ok(text.includes('🤼 *PRO WRESTLING HIGH ROLLER*'));
  assert.ok(text.includes('Roman Reigns'));
  assert.ok(text.includes('Money in the Bank 2026'));
  assert.ok(text.includes('World Heavyweight Championship'));
  assert.ok(text.includes('1.10'));
  assert.ok(text.includes('₹100,000.00'));
  assert.ok(text.includes('881923145'));
});

test('TelegramNotifier respects enabled flag', () => {
  const disabledNotifier = new TelegramNotifier('token', 'chatId', false);
  assert.equal(disabledNotifier.enabled, false);

  const enabledNotifier = new TelegramNotifier('token', 'chatId', true);
  assert.equal(enabledNotifier.enabled, true);
});
