import assert from 'node:assert/strict';
import test from 'node:test';
import { looksBaseball, looksPlayerProp, looksProWrestling, classifyBet } from '../src/filter.js';

test('looksBaseball detects MLB and baseball keywords', () => {
  assert.equal(looksBaseball({ sport: 'Baseball', rawText: 'Yankees - Red Sox' }), true);
  assert.equal(looksBaseball({ sport: 'Soccer', rawText: 'Man City - Arsenal' }), false);
});

test('looksPlayerProp preserves original MLB single-event heuristic', () => {
  assert.equal(looksPlayerProp({ sport: 'Baseball', event: 'Aaron Judge', rawText: 'Baseball' }, true), true);
  assert.equal(looksPlayerProp({ sport: 'Baseball', event: 'Yankees - Red Sox', rawText: 'Baseball' }, true), false);
  assert.equal(looksPlayerProp({ sport: 'Baseball', event: 'Multi (3)', rawText: 'Baseball' }, true), false);
});

test('looksProWrestling detects Specials and Wrestling bets', () => {
  assert.equal(looksProWrestling({
    sport: 'Specials',
    event: 'Roman Reigns',
    rawText: 'Specials Roman Reigns 1.10 $10,000'
  }), true);

  assert.equal(looksProWrestling({
    sport: 'ProWrestling',
    event: '2027 Men\'s Royal Rumble Match Winner',
    rawText: 'Pro Wrestling 2027 Men\'s Royal Rumble Match Winner'
  }), true);

  assert.equal(looksProWrestling({
    sport: 'Soccer',
    event: 'Real Madrid - Barcelona',
    rawText: 'Soccer Real Madrid - Barcelona'
  }), false);
});

test('classifyBet correctly categorizes bets into buckets', () => {
  const mlbBet = { sport: 'Baseball', event: 'Shohei Ohtani', rawText: 'Baseball Shohei Ohtani' };
  const mlbMatch = classifyBet(mlbBet, { playerPropsOnly: true });
  assert.equal(mlbMatch.isMatch, true);
  assert.equal(mlbMatch.category, 'mlb');

  const wrestlingBet = { sport: 'Specials', event: 'Money in the Bank: Roman Reigns', rawText: 'Specials Money in the Bank' };
  const wrestlingMatch = classifyBet(wrestlingBet, { playerPropsOnly: true });
  assert.equal(wrestlingMatch.isMatch, true);
  assert.equal(wrestlingMatch.category, 'wrestling');

  const soccerBet = { sport: 'Soccer', event: 'Arsenal - Chelsea', rawText: 'Soccer' };
  const soccerMatch = classifyBet(soccerBet, { playerPropsOnly: true });
  assert.equal(soccerMatch.isMatch, false);
});
