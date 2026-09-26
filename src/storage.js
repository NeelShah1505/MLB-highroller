import fs from 'node:fs';
import path from 'node:path';

export class Storage {
  constructor(filePath = 'data/bets.jsonl', maxSeen = 5000) {
    this.filePath = filePath;
    this.maxSeen = maxSeen;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  loadSeen() {
    const seen = new Map();
    if (!fs.existsSync(this.filePath)) return seen;

    try {
      const lines = fs.readFileSync(this.filePath, 'utf8').split('\n').filter(Boolean);
      const recent = lines.slice(-this.maxSeen);
      for (const line of recent) {
        try {
          const record = JSON.parse(line);
          const id = record.id || record.rawId || [record.event, record.user, record.time, record.odds, record.amount].join(' | ');
          if (id) seen.set(id, record.capturedAt ? new Date(record.capturedAt).getTime() : Date.now());
        } catch {}
      }
    } catch (err) {
      console.error(`[STORAGE] Error reading ${this.filePath}:`, err.message);
    }
    return seen;
  }

  append(bet) {
    const record = {
      ...bet,
      capturedAt: new Date().toISOString(),
    };
    fs.appendFileSync(this.filePath, JSON.stringify(record) + '\n');
  }

  prune(seen) {
    if (seen.size <= this.maxSeen) return;
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    for (const [id, ts] of seen) {
      if (ts < cutoff) seen.delete(id);
    }
    while (seen.size > this.maxSeen) {
      seen.delete(seen.keys().next().value);
    }
  }
}
