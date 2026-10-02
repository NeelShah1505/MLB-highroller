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
  assert.ok(text.includes('🚨 *HIGH ROLLER BET ALERT*'));
  assert.ok(text.includes('1️⃣ *Sport/Type:* `Soccer`'));
  assert.ok(text.includes('2️⃣ *Username:* `WhaleBettor`'));
  assert.ok(text.includes('3️⃣ *Selection:* `Real Madrid`'));
  assert.ok(text.includes('4️⃣ *Event:* `Real Madrid - Barcelona`'));
  assert.ok(text.includes('5️⃣ *Market:* `Match Winner`'));
  assert.ok(text.includes('6️⃣ *Stake:* `$250,000.00`'));
  assert.ok(text.includes('7️⃣ *Odds:* `2.15`'));
  assert.ok(text.includes('8️⃣ *Time:* `7:14 PM`'));
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
  assert.ok(text.includes('🤼 *PRO WRESTLING BET ALERT*'));
  assert.ok(text.includes('1️⃣ *Sport/Type:* `Pro Wrestling`'));
  assert.ok(text.includes('2️⃣ *Username:* `Hidden`'));
  assert.ok(text.includes('3️⃣ *Selection:* `Roman Reigns`'));
  assert.ok(text.includes('4️⃣ *Event:* `Money in the Bank 2026`'));
  assert.ok(text.includes('5️⃣ *Market:* `World Heavyweight Championship`'));
  assert.ok(text.includes('6️⃣ *Stake:* `₹100,000.00`'));
  assert.ok(text.includes('7️⃣ *Odds:* `1.10`'));
  assert.ok(text.includes('8️⃣ *Time:* `7:14 PM`'));
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
  assert.ok(text.includes('🤼 *PRO WRESTLING BET ALERT*'));
  assert.ok(text.includes('1️⃣ *Sport/Type:* `Pro Wrestling`'));
  assert.ok(text.includes('2️⃣ *Username:* `⭐ Elinio777`'));
  assert.ok(text.includes('3️⃣ *Selection:* `Oba Femi`'));
  assert.ok(text.includes('4️⃣ *Event:* `Money in the Bank 2026: Oba Femi vs Bronson Reed`'));
  assert.ok(text.includes('5️⃣ *Market:* `Match Winner`'));
  assert.ok(text.includes('6️⃣ *Stake:* `₹1,19,593.85 ₿`'));
  assert.ok(text.includes('7️⃣ *Odds:* `1.25`'));
  assert.ok(text.includes('8️⃣ *Time:* `10/1/2026 at 12:53 AM`'));
  assert.ok(text.includes('⚡ *Live Detected:*'));
  assert.ok(text.includes('💵 *Payout:* `₹1,49,492.32 ₿`'));
  assert.ok(text.includes('🆔 *Bet ID:* `661,868,490`'));
});

test('TelegramNotifier respects enabled flag', () => {
  const disabledNotifier = new TelegramNotifier('token', 'chatId', false);
  assert.equal(disabledNotifier.enabled, false);

  const enabledNotifier = new TelegramNotifier('token', 'chatId', true);
  assert.equal(enabledNotifier.enabled, true);
});
