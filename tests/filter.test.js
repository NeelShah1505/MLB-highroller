import assert from 'node:assert/strict';
import test from 'node:test';
import { looksTennis, looksProWrestling, classifyBet } from '../src/filter.js';

test('looksTennis detects Tennis rows from sport icon or row text', () => {
  // 1. Tennis row with icon
  assert.equal(looksTennis({
    sport: 'Tennis',
    icons: ['Tennis', 'AnonymousFilled', 'USDT'],
    event: 'Daniil Medvedev - Valentin Royer',
    rawText: 'Daniil Medvedev - Valentin Royer Hidden 11:44 AM 1.09 $2,819.86',
  }), true);

  // 2. Tennis row with single player / event
  assert.equal(looksTennis({
    sport: 'Tennis',
    icons: ['Tennis', 'AnonymousFilled', 'USDC'],
    event: 'Valentin Royer',
    rawText: 'Valentin Royer Hidden 10:24 AM 2.15 ₹67,425',
  }), true);
});

test('looksTennis strictly ignores non-tennis sports', () => {
  // Table Tennis must be rejected
  assert.equal(looksTennis({
    sport: 'TableTennis',
    icons: ['TableTennis', 'AnonymousFilled', 'USDC'],
    event: 'Mleczko - Piotrowski',
    rawText: 'TableTennis Mleczko - Piotrowski',
  }), false);

  // Soccer must be rejected
  assert.equal(looksTennis({
    sport: 'Soccer',
    icons: ['Soccer'],
    event: 'Real Madrid - Barcelona',
    rawText: 'Soccer Real Madrid - Barcelona',
  }), false);

  // Basketball must be rejected
  assert.equal(looksTennis({
    sport: 'Basketball',
    icons: ['Basketball'],
    event: 'Lakers - Celtics',
    rawText: 'Basketball Lakers - Celtics',
  }), false);

  // Cricket must be rejected
  assert.equal(looksTennis({
    sport: 'Cricket',
    icons: ['Cricket'],
    event: 'India - Australia',
    rawText: 'Cricket India - Australia',
  }), false);

  // Baseball must be rejected in tennis mode
  assert.equal(looksTennis({
    sport: 'Baseball',
    icons: ['Baseball'],
    event: 'Aaron Judge - Home Run',
    rawText: 'Baseball Aaron Judge',
  }), false);

  // Pro Wrestling / Specials must be rejected
  assert.equal(looksTennis({
    sport: 'Specials',
    icons: ['Specials'],
    event: 'Roman Reigns',
    rawText: 'Specials Roman Reigns',
  }), false);

  // Multi bets must be rejected
  assert.equal(looksTennis({
    sport: 'Tennis',
    icons: ['BetMulti'],
    event: 'Multi (3)',
    rawText: 'Multi (3) Hidden 11:42 AM 2.24 $4,996.00',
  }), false);
});

test('looksProWrestling detects all Pro Wrestling bets including championships and event-only rows', () => {
  // 1. Row displaying only "Pro Wrestling" (critical requirement from handoff)
  assert.equal(looksProWrestling({
    sport: 'Pro Wrestling',
    event: 'Pro Wrestling',
    rawText: 'Pro Wrestling Hidden 2:30 PM 2.50 $10,000.00',
    icons: ['AnonymousFilled', 'USDT']
  }), true);

  // 2. Row with sport icon Wrestling
  assert.equal(looksProWrestling({
    sport: 'Wrestling',
    event: 'Roman Reigns',
    rawText: 'Roman Reigns Hidden 1.10 $5,000.00',
    icons: ['Wrestling', 'AnonymousFilled']
  }), true);

  // 3. Special event market: Money in the Bank 2026 / World Heavyweight Championship
  assert.equal(looksProWrestling({
    sport: 'Specials',
    event: 'Money in the Bank 2026 - World Heavyweight Championship',
    rawText: 'Money in the Bank 2026 - World Heavyweight Championship 1.85 $15,000.00',
    icons: ['Specials']
  }), true);

  // 4. Special event market: Royal Rumble Match Winner
  assert.equal(looksProWrestling({
    sport: 'Specials',
    event: 'Royal Rumble Match Winner',
    rawText: 'Royal Rumble Match Winner Hidden 2.10 $8,000.00',
    icons: ['Specials']
  }), true);

  // 5. Wrestler name without explicit wrestling word
  assert.equal(looksProWrestling({
    sport: 'Specials',
    event: 'Cody Rhodes',
    rawText: 'Cody Rhodes Hidden 1.45 $25,000.00',
    icons: ['Specials']
  }), true);
});

test('looksProWrestling strictly ignores non-wrestling sports', () => {
  // Tennis must be rejected
  assert.equal(looksProWrestling({
    sport: 'Tennis',
    icons: ['Tennis'],
    event: 'Daniil Medvedev - Valentin Royer',
    rawText: 'Tennis Daniil Medvedev',
  }), false);

  // Soccer must be rejected
  assert.equal(looksProWrestling({
    sport: 'Soccer',
    icons: ['Soccer'],
    event: 'Bayern Munich - Real Madrid',
    rawText: 'Soccer Bayern Munich',
  }), false);

  // Basketball must be rejected
  assert.equal(looksProWrestling({
    sport: 'Basketball',
    icons: ['Basketball'],
    event: 'Lakers - Celtics',
    rawText: 'Basketball Lakers',
  }), false);

  // Table Tennis must be rejected
  assert.equal(looksProWrestling({
    sport: 'TableTennis',
    icons: ['TableTennis'],
    event: 'Makajew - Kesik',
    rawText: 'TableTennis Makajew',
  }), false);

  // Multi bets must be rejected
  assert.equal(looksProWrestling({
    sport: 'Wrestling',
    icons: ['BetMulti'],
    event: 'Multi (3)',
    rawText: 'Multi (3) Hidden 2.24 $4,996.00',
  }), false);
});

test('classifyBet strictly applies Rule 1 and Rule 2 based on Naksh specifications', () => {
  // RULE 1: All Sports High Rollers (Stake > $199k AND Odds > 1.50)
  // Example 1: $199,001 @ 1.51 -> MATCH
  const ex1 = classifyBet({ sport: 'Soccer', amount: '$199,001', odds: '1.51', event: 'Arsenal - Chelsea' });
  assert.equal(ex1.isMatch, true);
  assert.equal(ex1.category, 'highroller');

  // Example 2: $250,000 @ 2.00 -> MATCH
  const ex2 = classifyBet({ sport: 'Basketball', amount: '$250,000', odds: '2.00', event: 'Lakers - Celtics' });
  assert.equal(ex2.isMatch, true);
  assert.equal(ex2.category, 'highroller');

  // Example 3: $199,000 @ 2.00 -> NO MATCH (amount must be strictly > 199000)
  const ex3 = classifyBet({ sport: 'Tennis', amount: '$199,000', odds: '2.00', event: 'Alcaraz - Sinner' });
  assert.equal(ex3.isMatch, false);

  // Example 4: $300,000 @ 1.50 -> NO MATCH (odds must be strictly > 1.50)
  const ex4 = classifyBet({ sport: 'Cricket', amount: '$300,000', odds: '1.50', event: 'India - Australia' });
  assert.equal(ex4.isMatch, false);

  // Example 5: $150,000 @ 3.00 -> NO MATCH (amount must be > 199000)
  const ex5 = classifyBet({ sport: 'IceHockey', amount: '$150,000', odds: '3.00', event: 'Rangers - Bruins' });
  assert.equal(ex5.isMatch, false);

  // RULE 2: Pro Wrestling - EVERY bet regardless of stake or odds
  const w1 = classifyBet({ sport: 'Pro Wrestling', amount: '$50', odds: '1.05', event: 'Roman Reigns' });
  assert.equal(w1.isMatch, true);
  assert.equal(w1.category, 'wrestling');

  const w2 = classifyBet({ sport: 'Specials', amount: '$1,000', odds: '2.50', event: 'Money in the Bank 2026' });
  assert.equal(w2.isMatch, true);
  assert.equal(w2.category, 'wrestling');

  const w3 = classifyBet({ sport: 'Wrestling', amount: '$250,000', odds: '1.20', event: 'Royal Rumble Match Winner' });
  assert.equal(w3.isMatch, true);
  assert.equal(w3.category, 'wrestling');
});
