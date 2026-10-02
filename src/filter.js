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
  'roman reigns', 'cody rhodes', 'gunther', 'bron breakker', 'oba femi',
  'kevin owens', 'trick williams', 'la knight', 'seth rollins', 'cm punk',
  'rhea ripley', 'john cena', 'the rock', 'dwayne johnson', 'logan paul',
  'drew mcintyre', 'damian priest', 'jey uso', 'jimmy uso', 'solo sikoa'
];

export function looksProWrestling(r) {
  const sport = (r.sport || '').toLowerCase();
  const hay = `${sport} ${r.event || ''} ${r.rawText || ''}`.toLowerCase();

  if (sport.includes('wrestling') || hay.includes('pro wrestling')) {
    return true;
  }

  const isSpecials = sport.includes('special') || sport.includes('entertainment') || hay.includes('specials');
  if (isSpecials && WRESTLING_KEYWORDS.some(kw => hay.includes(kw))) {
    return true;
  }

  return WRESTLING_KEYWORDS.some(kw => hay.includes(kw));
}

export function classifyBet(r, cfg = { playerPropsOnly: true, targetSport: 'tennis' }) {
  const target = (cfg.targetSport || 'tennis').toLowerCase();

  // If configured for Tennis (default)
  if (target === 'tennis') {
    if (looksTennis(r)) {
      return { isMatch: true, category: 'tennis' };
    }
    return { isMatch: false, category: null };
  }

  // If configured for All or Multi-sport
  if (looksTennis(r)) {
    return { isMatch: true, category: 'tennis' };
  }
  if (looksProWrestling(r)) {
    return { isMatch: true, category: 'wrestling' };
  }
  if (looksPlayerProp(r, cfg.playerPropsOnly)) {
    return { isMatch: true, category: 'mlb' };
  }

  return { isMatch: false, category: null };
}
