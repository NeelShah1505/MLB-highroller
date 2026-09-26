function norm(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
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

  // 1. Direct sport match for Wrestling / Pro Wrestling
  if (sport.includes('wrestling') || hay.includes('pro wrestling')) {
    return true;
  }

  // 2. Specials / Entertainment category containing wrestling keywords
  const isSpecials = sport.includes('special') || sport.includes('entertainment') || hay.includes('specials');
  if (isSpecials && WRESTLING_KEYWORDS.some(kw => hay.includes(kw))) {
    return true;
  }

  // 3. Any high roller bet referencing wrestling events or top wrestlers
  return WRESTLING_KEYWORDS.some(kw => hay.includes(kw));
}

export function classifyBet(r, cfg = { playerPropsOnly: true }) {
  if (looksProWrestling(r)) {
    return { isMatch: true, category: 'wrestling' };
  }
  if (looksPlayerProp(r, cfg.playerPropsOnly)) {
    return { isMatch: true, category: 'mlb' };
  }
  return { isMatch: false, category: null };
}
