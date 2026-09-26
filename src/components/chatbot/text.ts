// Shared text helpers: normalization, light German stemming and typo-tolerant
// token matching. Used by both intent detection and product search.
import { PHRASE_SYNONYMS } from '../../data/products';

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

/** Damerau-Levenshtein (optimal string alignment): a swapped letter pair
 * ("taiks") counts as one typo. */
export function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[a.length][b.length];
}

/** Do two tokens mean the same word? Exact; or, for words of 5+ letters, one
 * contains the other ("chips" in "kartoffelchips", compound words) or — with
 * `fuzzy` — they differ by a typo or two. Short words must match exactly, so
 * "blum" can never be mistaken for "blue". */
export function tokensMatch(a: string, b: string, fuzzy = true): boolean {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  if (shorter < 5) return false;
  if (a.includes(b) || b.includes(a)) return true;
  if (!fuzzy || a[0] !== b[0]) return false;
  const tolerance = Math.max(a.length, b.length) >= 8 ? 2 : 1;
  if (Math.abs(a.length - b.length) > tolerance) return false;
  return editDistance(a, b) <= tolerance;
}

/** Does any token equal (or, for words of 5+ letters, fuzzily match) any of
 * `words`? `words` must be written in normalized spelling. */
export function hasWord(tokens: string[], words: readonly string[]): boolean {
  return tokens.some((token) => words.some((word) => token === word || (word.length >= 5 && token.length >= 5 && tokensMatch(token, word))));
}

/** Exact-only variant, for small function words where fuzziness would misfire. */
export function hasExact(tokens: string[], words: readonly string[]): boolean {
  return tokens.some((token) => words.includes(token));
}

/** Filler words that carry no product meaning — stripped before searching, so
 * "Habt ihr bitte auch noch blaue Takis?" is searched as "blue takis". */
export const STOPWORDS = new Set([
  // asking / availability
  'habt', 'haben', 'hast', 'hat', 'gibt', 'gibts', 'verkauft', 'verkaufen', 'verkauf', 'fuehrt', 'fuehren', 'bekomme',
  'bekommt', 'kaufen', 'kann', 'koennt', 'koennte', 'koennen', 'kriege', 'kriegt', 'vorraetig', 'lager', 'sortiment',
  'welche', 'welcher', 'welches', 'welchen', 'sorten', 'sorte', 'varianten', 'variante', 'alle', 'liste', 'aufzaehlen',
  'zeig', 'zeige', 'zeigen', 'nennen', 'nenn', 'sag', 'sagen',
  // price
  'kostet', 'kosten', 'preis', 'preise', 'wieviel', 'viel', 'euro',
  // grammar / fillers
  'ihr', 'euch', 'eure', 'euer', 'uns', 'du', 'sie', 'ich', 'mir', 'mich', 'wir', 'man', 'es', 's', 'da', 'dort', 'hier',
  'bei', 'im', 'in', 'am', 'an', 'auf', 'aus', 'von', 'mit', 'fuer', 'zu', 'zum', 'zur', 'der', 'die', 'das', 'den', 'dem',
  'ein', 'eine', 'einen', 'einer', 'eines', 'und', 'oder', 'auch', 'noch', 'mal', 'bitte', 'denn', 'so', 'dann', 'eigentlich',
  'vielleicht', 'gerade', 'jetzt', 'aktuell', 'momentan', 'gern', 'gerne', 'moechte', 'moechten', 'wuerde', 'wuerden',
  'ist', 'sind', 'seid', 'wo', 'was', 'wie', 'ob', 'wann', 'wer', 'irgendwelche', 'irgendwo', 'sonst', 'nur',
  // packaging and size words: "eine Dose Red Bull", "eine große Packung"
  'dose', 'dosen', 'flasche', 'flaschen', 'packung', 'packungen', 'pack', 'stange', 'stangen', 'schachtel', 'stueck',
  'stuecke', 'gross', 'grosse', 'grossen', 'klein', 'kleine', 'kleinen',
  // greetings / thanks / goodbyes
  'hallo', 'hi', 'hey', 'moin', 'servus', 'huhu', 'guten', 'tag', 'abend', 'gruess', 'gott', 'danke', 'dankeschoen',
  'vielen', 'dank', 'tschuess', 'tschau', 'ciao', 'bye', 'wiedersehen',
]);

/** One-typo match for the short question words ("hbat", "hapt" → "habt"),
 * which `tokensMatch` deliberately doesn't fuzz because of their length. */
export function isTypoOf(token: string, words: readonly string[]): boolean {
  return (
    token.length >= 4 &&
    words.some((word) => token[0] === word[0] && Math.abs(token.length - word.length) <= 1 && editDistance(token, word) <= 1)
  );
}

const TYPO_TOLERANT_STOPWORDS = ['habt', 'gibt', 'welche'];

/** A filler word, typos included ("hbat ihr", "hapt ihr"). */
export function isStopword(token: string): boolean {
  return STOPWORDS.has(token) || isTypoOf(token, TYPO_TOLERANT_STOPWORDS);
}
