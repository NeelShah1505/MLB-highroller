import assert from 'node:assert/strict';
import test from 'node:test';
import { formatNotification, TelegramNotifier } from '../src/telegram.js';

test('formatNotification formats All Sports High Roller with exact 1-to-8 sequence', () => {
  const bet = {
    sportName: 'Soccer',
    event: 'Real Madrid - Barcelona',
    selection: 'Real Madrid',
    market: 'Match Winner',
    odds: '2.15',
    amount: '$250,000.00',
    user: 'WhaleBettor',
    time: '7:14 PM',
    betId: '992817263',
    category: 'highroller',
  };
  const text = formatNotification(bet, 'highroller');
  assert.ok(text.includes('🚨 <b>HIGH ROLLER BET ALERT</b>'));
  assert.ok(text.includes('1️⃣ <b>Sport/Type:</b> <code>Soccer</code>'));
  assert.ok(text.includes('2️⃣ <b>Username:</b> <code>WhaleBettor</code>'));
  assert.ok(text.includes('3️⃣ <b>Selection:</b> <code>Real Madrid</code>'));
  assert.ok(text.includes('4️⃣ <b>Event:</b> <code>Real Madrid - Barcelona</code>'));
  assert.ok(text.includes('5️⃣ <b>Market:</b> <code>Match Winner</code>'));
  assert.ok(text.includes('6️⃣ <b>Stake:</b> <code>$250,000.00</code>'));
  assert.ok(text.includes('7️⃣ <b>Odds:</b> <code>2.15</code>'));
  assert.ok(text.includes('8️⃣ <b>Time:</b> <code>7:14 PM</code>'));
  assert.ok(text.includes('992817263'));
});

test('formatNotification formats Pro Wrestling high roller with exact 1-to-8 sequence', () => {
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
  assert.ok(text.includes('🤼 <b>PRO WRESTLING BET ALERT</b>'));
  assert.ok(text.includes('1️⃣ <b>Sport/Type:</b> <code>Pro Wrestling</code>'));
  assert.ok(text.includes('2️⃣ <b>Username:</b> <code>Hidden</code>'));
  assert.ok(text.includes('3️⃣ <b>Selection:</b> <code>Roman Reigns</code>'));
  assert.ok(text.includes('4️⃣ <b>Event:</b> <code>Money in the Bank 2026</code>'));
  assert.ok(text.includes('5️⃣ <b>Market:</b> <code>World Heavyweight Championship</code>'));
  assert.ok(text.includes('6️⃣ <b>Stake:</b> <code>₹100,000.00</code>'));
  assert.ok(text.includes('7️⃣ <b>Odds:</b> <code>1.10</code>'));
  assert.ok(text.includes('8️⃣ <b>Time:</b> <code>7:14 PM</code>'));
  assert.ok(text.includes('881923145'));
});

test('formatNotification formats Oba Femi live bet from Stake screenshot with exact 1-to-8 sequence', () => {
  const bet = {
    sportName: 'Pro Wrestling',
    user: '⭐ Elinio777',
    selection: 'Oba Femi',
    event: 'Money in the Bank 2026: Oba Femi vs Bronson Reed',
    market: 'Match Winner',
    amount: '₹1,19,593.85 ₿',
    odds: '1.25',
    time: '10/1/2026 at 12:53 AM',
    payout: '₹1,49,492.32 ₿',
    betId: '661,868,490',
    category: 'wrestling',
  };
  const text = formatNotification(bet, 'wrestling');
  assert.ok(text.includes('🤼 <b>PRO WRESTLING BET ALERT</b>'));
  assert.ok(text.includes('1️⃣ <b>Sport/Type:</b> <code>Pro Wrestling</code>'));
  assert.ok(text.includes('2️⃣ <b>Username:</b> <code>⭐ Elinio777</code>'));
  assert.ok(text.includes('3️⃣ <b>Selection:</b> <code>Oba Femi</code>'));
  assert.ok(text.includes('4️⃣ <b>Event:</b> <code>Money in the Bank 2026: Oba Femi vs Bronson Reed</code>'));
  assert.ok(text.includes('5️⃣ <b>Market:</b> <code>Match Winner</code>'));
  assert.ok(text.includes('6️⃣ <b>Stake:</b> <code>₹1,19,593.85 ₿</code>'));
  assert.ok(text.includes('7️⃣ <b>Odds:</b> <code>1.25</code>'));
  assert.ok(text.includes('8️⃣ <b>Time:</b> <code>10/1/2026 at 12:53 AM</code>'));
  assert.ok(text.includes('⚡ <b>Live Detected:</b>'));
  assert.ok(text.includes('💵 <b>Payout:</b> <code>₹1,49,492.32 ₿</code>'));
  assert.ok(text.includes('🆔 <b>Bet ID:</b> <code>661,868,490</code>'));
});

test('TelegramNotifier respects enabled flag', () => {
  const disabledNotifier = new TelegramNotifier('token', 'chatId', false);
  assert.equal(disabledNotifier.enabled, false);

  const enabledNotifier = new TelegramNotifier('token', 'chatId', true);
  assert.equal(enabledNotifier.enabled, true);
});
