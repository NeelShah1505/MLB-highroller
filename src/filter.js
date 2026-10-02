function norm(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

/**
 * Checks if a High Roller row belongs to Tennis.
 * Explicitly ignores:
 * - Table Tennis
 * - Soccer, Basketball, Cricket, Baseball, Ice Hockey, Specials/Wrestling, etc.
 * - Multi bets (Multi 2, Multi 3, etc.)
 */
export function looksTennis(r) {
  const sport = (r.sport || '').toLowerCase();
  const hay = `${sport} ${r.rawText || ''}`.toLowerCase();
  const event = norm(r.event).toLowerCase();

  // 1. Multi bets are strictly excluded
  if (!event || /^multi\b/i.test(event) || /^multi\b/i.test(r.rawText || '')) {
    return false;
  }
  if (Array.isArray(r.icons) && r.icons.some(i => i.toLowerCase().includes('multi'))) {
    return false;
  }

  // 2. Explicitly reject Table Tennis
  if (sport.includes('table') || hay.includes('table tennis') || hay.includes('tabletennis')) {
    return false;
  }
  if (Array.isArray(r.icons) && r.icons.includes('TableTennis')) {
    return false;
  }

  // 3. Reject other known sports if sport property is explicitly defined as non-tennis
  const nonTennisSports = ['soccer', 'basketball', 'cricket', 'baseball', 'icehockey', 'specials', 'entertainment', 'americanfootball', 'mma', 'darts', 'rugby', 'snooker', 'volleyball', 'handball', 'futsal', 'boxing', 'motorsport'];
  if (nonTennisSports.includes(sport)) {
    return false;
  }

  // 4. Check sport property and icons
  if (sport === 'tennis' || sport.includes('tennis')) {
    return true;
  }
  if (Array.isArray(r.icons) && r.icons.includes('Tennis')) {
    return true;
  }

  return false;
}

export function looksBaseball(r) {
  const hay = `${r.sport || ''} ${r.rawText || ''}`.toLowerCase();
  return (r.sport || '').toLowerCase() === 'baseball' || hay.includes('baseball') || hay.includes('mlb');
}

export function looksPlayerProp(r, playerPropsOnly = true) {
  if (!looksBaseball(r)) return false;
  if (!playerPropsOnly) return true;
  const e = norm(r.event);
  if (!e || /^multi\b/i.test(e)) return false;
  if (/\s[-–—]\s/.test(e)) return false;
  return true;
}

const WRESTLING_KEYWORDS = [
  'wrestling', 'pro wrestling', 'wwe', 'aew', 'royal rumble',
  'money in the bank', 'wrestlemania', 'summer slam', 'summerslam',
  'survivor series', 'elimination chamber', 'crown jewel', 'bad blood',
  'world heavyweight', 'wwe championship', 'universal championship',
  'intercontinental championship', 'united states championship',
  'women\'s world championship', 'women\'s championship', 'tag team championship',
  'match winner', 'royal rumble winner', 'royal rumble match winner',
  'roman reigns', 'cody rhodes', 'gunther', 'bron breakker', 'oba femi',
  'kevin owens', 'trick williams', 'la knight', 'seth rollins', 'cm punk',
  'rhea ripley', 'john cena', 'the rock', 'dwayne johnson', 'logan paul',
  'drew mcintyre', 'damian priest', 'jey uso', 'jimmy uso', 'solo sikoa',
  'brock lesnar', 'randy orton', 'jade cargill', 'bianca belair', 'charlotte flair',
  'becky lynch', 'bayley', 'liv morgan', 'dominik mysterio', 'finn balor',
  'ilja dragunov', 'shinsuke nakamura', 'aj styles', 'sami zayn', 'sheamus',
  'rey mysterio', 'chad gable', 'austin theory', 'karrion kross', 'bray wyatt',
  'uncle howdy', 'darby allin', 'mjf', 'will ospreay', 'swerve strickland',
  'kazuchika okada', 'kenny omega', 'hangman page', 'jon moxley', 'mercedes mone'
];

export function looksProWrestling(r) {
  const sport = (r.sport || '').toLowerCase();
  const event = norm(r.event).toLowerCase();
  const raw = norm(r.rawText || '').toLowerCase();
  const hay = `${sport} ${event} ${raw}`.toLowerCase();

  // 1. Exclude multi bets
  if (!event || /^multi\b/i.test(event) || /^multi\b/i.test(raw)) {
    return false;
  }
  if (Array.isArray(r.icons) && r.icons.some(i => i.toLowerCase().includes('multi'))) {
    return false;
  }

  // 2. Exclude other known sports if their icon or sport name is unambiguous
  const nonWrestlingSports = [
    'tennis', 'tabletennis', 'soccer', 'basketball', 'cricket',
    'baseball', 'icehockey', 'americanfootball', 'darts', 'rugby',
    'snooker', 'volleyball', 'handball', 'futsal', 'boxing', 'motorsport'
  ];
  if (Array.isArray(r.icons) && r.icons.some(i => nonWrestlingSports.includes(i.toLowerCase()))) {
    return false;
  }
  if (nonWrestlingSports.includes(sport)) {
    return false;
  }

  // 3. Positive match on Sport / Icon
  if (sport.includes('wrestling') || sport.includes('prowrestling') || sport.includes('wwe') || sport.includes('aew')) {
    return true;
  }
  if (Array.isArray(r.icons) && r.icons.some(i => ['Wrestling', 'ProWrestling', 'WWE', 'AEW'].includes(i))) {
    return true;
  }

  // 4. Matches if the row/event says "Pro Wrestling" (critical requirement from handoff)
  if (event.includes('pro wrestling') || event === 'wrestling' || raw.includes('pro wrestling')) {
    return true;
  }

  // 5. Matches wrestling championships / events / keywords
  if (WRESTLING_KEYWORDS.some(kw => hay.includes(kw))) {
    return true;
  }

  return false;
}

export function parseAmount(s) {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const cleaned = String(s).replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function parseOdds(s) {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const cleaned = String(s).replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatSportName(rawSport, icons = [], event = '') {
  if (looksProWrestling({ sport: rawSport, icons, event })) {
    return 'Pro Wrestling';
  }
  const s = String(rawSport || '').trim();
  if (!s || ['AnonymousFilled', 'USDT', 'USDC', 'BTC', 'ETH', 'DAI'].includes(s)) {
    const found = icons.find(i => !['AnonymousFilled', 'USDT', 'USDC', 'BTC', 'ETH', 'DAI', 'CanadaFlag'].includes(i));
    if (found) return found.replace(/([a-z])([A-Z])/g, '$1 $2');
    return 'Sports';
  }
  return s.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * Dual Notification Rules:
 *
 * RULE 1 — All Sports High Rollers:
 *   - Monitor ALL sports/categories.
 *   - Notify ONLY when: Stake > $199,000 AND Decimal Odds > 1.50.
 *
 * RULE 2 — Pro Wrestling:
 *   - Notify for EVERY Pro Wrestling bet, regardless of stake or odds.
 *   - Includes all markets (championships, match winner, Royal Rumble, Money in the Bank, etc.).
 */
export function classifyBet(r, cfg = {}) {
  // RULE 2: Pro Wrestling - Any stake, any odds
  if (looksProWrestling(r)) {
    return {
      isMatch: true,
      category: 'wrestling',
      rule: 'RULE 2 — Pro Wrestling (All Stakes & Odds)',
    };
  }

  // RULE 1: All Sports High Rollers - Stake > $199,000 AND Decimal Odds > 1.50
  const amount = parseAmount(r.amount);
  const odds = parseOdds(r.odds);

  if (amount > 199000 && odds > 1.50) {
    return {
      isMatch: true,
      category: 'highroller',
      rule: 'RULE 1 — All Sports High Roller (Stake > $199k & Odds > 1.50)',
    };
  }

  return { isMatch: false, category: null, rule: null };
}
