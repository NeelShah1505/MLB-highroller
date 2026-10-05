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

  // 4. Check sport property and icons (case-insensitive)
  if ((sport.includes('tennis') || hay.includes('tennis')) && !sport.includes('table') && !hay.includes('table tennis') && !hay.includes('tabletennis')) {
    return true;
  }
  if (Array.isArray(r.icons) && r.icons.some(i => i.toLowerCase().includes('tennis') && !i.toLowerCase().includes('table'))) {
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
  'wrestl', 'pro wrestling', 'wwe', 'aew', 'royal rumble',
  'money in the bank', 'wrestlemania', 'summer slam', 'summerslam',
  'survivor series', 'elimination chamber', 'crown jewel', 'bad blood',
  'world heavyweight', 'wwe championship', 'universal championship',
  'intercontinental championship', 'united states championship',
  'women\'s world championship', 'women\'s championship', 'tag team championship',
  'match winner', 'royal rumble winner', 'royal rumble match winner',
  'roman reigns', 'cody rhodes', 'gunther', 'bron breakker', 'oba femi', 'bronson reed',
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
  if (sport.includes('wrestl') || sport.includes('wwe') || sport.includes('aew')) {
    return true;
  }
  if (Array.isArray(r.icons) && r.icons.some(i => ['Wrestling', 'ProWrestling', 'WWE', 'AEW'].includes(i))) {
    return true;
  }

  // 4. Matches truncated "Pro Wrestli..." or full "Pro Wrestling" or "Wrestling" in row/event
  if (/pro\s*wrestl/i.test(hay) || /\bwrestl/i.test(hay) || event.includes('pro wrestling') || raw.includes('pro wrestling')) {
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

/**
 * Normalizes any currency string into USD equivalent.
 * Ensures Rule 1 evaluates against true $199,000 USD regardless of whether
 * the user's Stake interface renders in INR (₹), EUR (€), GBP (£), or USD ($).
 */
export function parseUsdAmount(s) {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const str = String(s);
  const cleaned = str.replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;

  if (str.includes('₹')) {
    return n / 86.5; // Convert INR (₹) to approximate USD
  }
  if (str.includes('€')) {
    return n * 1.08; // Convert EUR (€) to USD
  }
  if (str.includes('£')) {
    return n * 1.28; // Convert GBP (£) to USD
  }
  if (str.includes('¥')) {
    return n / 155; // Convert JPY (¥) to USD
  }
  return n;
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
  if (looksTennis({ sport: rawSport, icons, event })) {
    return 'Tennis';
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
 * Notification Rules:
 *
 * 1. TENNIS (Testing Mode):
 *    - Notify on EVERY Tennis High Roller bet (any stake, any odds).
 *
 * 2. PRO WRESTLING:
 *    - Notify on EVERY Pro Wrestling bet (any stake, any odds).
 *
 * 3. ALL OTHER SPORTS:
 *    - Stake > $199,000 USD AND Decimal Odds > 1.50.
 */
export function classifyBet(r, cfg = {}) {
  // Option: Rapid All-Sports Testing Mode (if user sets NOTIFY_ALL=true in .env)
  if (cfg.notifyAll === true || cfg.targetSport === 'all') {
    const isWrestling = looksProWrestling(r);
    const isTennis = looksTennis(r);
    return {
      isMatch: true,
      category: isWrestling ? 'wrestling' : (isTennis ? 'tennis' : 'highroller'),
      rule: 'ALL SPORTS (Rapid Live Testing Mode)',
    };
  }

  // TENNIS: Notify ALL Tennis bets (Testing Mode requested by user)
  if (looksTennis(r)) {
    return {
      isMatch: true,
      category: 'tennis',
      rule: 'TENNIS (All Stakes & Odds - Testing Mode)',
    };
  }

  // PRO WRESTLING: Any stake, any odds
  if (looksProWrestling(r)) {
    return {
      isMatch: true,
      category: 'wrestling',
      rule: 'PRO WRESTLING (All Stakes & Odds)',
    };
  }

  // ALL OTHER SPORTS: Stake > $199,000 USD AND Decimal Odds > 1.50
  const usdAmount = parseUsdAmount(r.amount);
  const odds = parseOdds(r.odds);

  if (usdAmount > 199000 && odds > 1.50) {
    return {
      isMatch: true,
      category: 'highroller',
      rule: 'ALL SPORTS HIGH ROLLER (Stake > $199k & Odds > 1.50)',
    };
  }

  return { isMatch: false, category: null, rule: null };
}
