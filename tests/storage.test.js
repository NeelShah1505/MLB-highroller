import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { Storage } from '../src/storage.js';

test('Storage seeds existing IDs from JSONL file and prunes cleanly', () => {
  const tmpFile = path.join('data', 'test_bets.jsonl');
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(tmpFile, JSON.stringify({ id: 'bet-1', capturedAt: new Date().toISOString() }) + '\n');

  const storage = new Storage(tmpFile, 10);
  const seen = storage.loadSeen();
  assert.equal(seen.has('bet-1'), true);
  assert.equal(seen.has('bet-2'), false);

  storage.append({ id: 'bet-2', event: 'Test Player' });
  const updatedSeen = storage.loadSeen();
  assert.equal(updatedSeen.has('bet-2'), true);

  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});
