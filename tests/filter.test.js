import assert from 'node:assert/strict';
import test from 'node:test';
import { looksTennis, classifyBet } from '../src/filter.js';

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

test('classifyBet in tennis mode only matches tennis bets', () => {
  const tennisBet = {
    sport: 'Tennis',
    icons: ['Tennis', 'AnonymousFilled', 'USDT'],
    event: 'Daniil Medvedev - Valentin Royer',
    rawText: 'Daniil Medvedev - Valentin Royer',
  };
  const tennisResult = classifyBet(tennisBet, { targetSport: 'tennis', playerPropsOnly: true });
  assert.equal(tennisResult.isMatch, true);
  assert.equal(tennisResult.category, 'tennis');

  const soccerBet = {
    sport: 'Soccer',
    icons: ['Soccer'],
    event: 'Arsenal - Chelsea',
    rawText: 'Soccer Arsenal - Chelsea',
  };
  const soccerResult = classifyBet(soccerBet, { targetSport: 'tennis', playerPropsOnly: true });
  assert.equal(soccerResult.isMatch, false);

  const tableTennisBet = {
    sport: 'TableTennis',
    icons: ['TableTennis'],
    event: 'Player A - Player B',
    rawText: 'TableTennis',
  };
  const tableTennisResult = classifyBet(tableTennisBet, { targetSport: 'tennis', playerPropsOnly: true });
  assert.equal(tableTennisResult.isMatch, false);
});
