// Turns raw user input into comparable tokens: lowercase, umlauts spelled out,
// punctuation gone, customer wording mapped to canonical words, plural
// endings stripped. Used on the user's message and on the product data alike.
import { PHRASE_SYNONYMS } from '../../data/synonyms';
import { isTypoOf } from './fuzzySearch';

const SYNONYM_RULES = PHRASE_SYNONYMS.map(([pattern, replacement]) => ({
  regex: new RegExp(`\\b${pattern}\\b`, 'g'),
  replacement,
}));

/** Lowercases, spells out umlauts (ä→ae etc.), strips punctuation and applies
 * the phrase synonyms ("blaue" → "blue", "Red Bull" → "redbull"). */
export function normalizeMessage(text: string): string {
  let out = text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const { regex, replacement } of SYNONYM_RULES) out = out.replace(regex, replacement);
  return out;
}

export function tokenize(text: string): string[] {
  const normalized = normalizeMessage(text);
  return normalized ? normalized.split(' ') : [];
}

const SUFFIXES = ['en', 'es', 'e', 's', 'n'];

/** Strips a German plural/case ending so "Zigaretten" and "Zigarette", or
 * "Takis" and "Taki", compare equal. Deliberately crude — fuzzy matching
 * covers what it misses. */
export function stem(token: string): string {
  if (token.length <= 4) return token;
  for (const suffix of SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 4 && !(suffix === 's' && token.endsWith('ss'))) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

/** Filler words that carry no product meaning — stripped before searching, so
 * "Habt ihr bitte auch noch blaue Takis?" is searched as "blue takis". */
export const STOPWORDS = new Set([
  // asking / availability
  'habt', 'haben', 'hab', 'hast', 'hat', 'gibt', 'gibts', 'verkauft', 'verkaufen', 'verkauf', 'fuehrt', 'fuehren', 'bekomme',
  'bekommt', 'kaufen', 'kann', 'koennt', 'koennte', 'koennen', 'kriege', 'kriegt', 'vorraetig', 'lager', 'sortiment',
  'vorhanden', 'verfuegbar', 'erhaeltlich',
  'welche', 'welcher', 'welches', 'welchen', 'sorten', 'sorte', 'varianten', 'variante', 'alle', 'liste', 'aufzaehlen',
  'zeig', 'zeige', 'zeigen', 'nennen', 'nenn', 'sag', 'sagen', 'geschmack',
  // recommendations
  'empfehlen', 'empfehlung', 'empfehlungen', 'empfiehlst', 'empfehle', 'beliebt', 'beliebteste', 'bestseller',
  // price
  'kostet', 'kosten', 'kostest', 'preis', 'preise', 'wieviel', 'viel', 'euro', 'teuer', 'guenstig',
  // grammar / fillers
  'ihr', 'euch', 'eure', 'euer', 'uns', 'du', 'sie', 'ich', 'mir', 'mich', 'wir', 'man', 'es', 's', 'da', 'dort', 'hier',
  'bei', 'im', 'in', 'am', 'an', 'auf', 'aus', 'von', 'mit', 'fuer', 'zu', 'zum', 'zur', 'der', 'die', 'das', 'den', 'dem',
  'ein', 'eine', 'einen', 'einer', 'eines', 'und', 'oder', 'auch', 'noch', 'mal', 'bitte', 'denn', 'so', 'dann', 'eigentlich',
  'vielleicht', 'gerade', 'jetzt', 'aktuell', 'momentan', 'heute', 'heut', 'gern', 'gerne', 'moechte', 'moechten', 'wuerde',
  'wuerden', 'ist', 'sind', 'seid', 'wo', 'was', 'wie', 'ob', 'wann', 'wer', 'irgendwelche', 'irgendwo', 'sonst', 'nur',
  'ja', 'jo', 'ok', 'okay', 'klar', 'sicher', 'natuerlich', 'yes',
  // packaging and size words: "eine Dose Red Bull", "eine große Packung"
  'dose', 'dosen', 'flasche', 'flaschen', 'packung', 'packungen', 'pack', 'stange', 'stangen', 'schachtel', 'stueck',
  'stuecke', 'gross', 'grosse', 'grossen', 'klein', 'kleine', 'kleinen',
  // greetings / thanks / goodbyes
  'hallo', 'hi', 'hey', 'moin', 'servus', 'huhu', 'guten', 'tag', 'abend', 'gruess', 'gott', 'danke', 'dankeschoen',
  'vielen', 'dank', 'tschuess', 'tschau', 'ciao', 'bye', 'wiedersehen', 'perfekt', 'hello',
]);

const TYPO_TOLERANT_STOPWORDS = ['habt', 'gibt', 'welche'];

/** A filler word, typos included ("hbat ihr", "hapt ihr"). */
export function isStopword(token: string): boolean {
  return STOPWORDS.has(token) || isTypoOf(token, TYPO_TOLERANT_STOPWORDS);
}
