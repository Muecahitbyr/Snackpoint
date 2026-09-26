// Typo-tolerant word comparison, all local. Similarity is a 0–1 score so
// callers can tell a sure match from a "maybe you meant …" one.

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

/** Lowest similarity a typo match may have. Keeps "monsta" → "monster"
 * (0.71) but rejects unrelated words that merely look alike. */
const MIN_TYPO_SIMILARITY = 0.7;

/** How similar are two tokens, 0–1?
 *  1     identical
 *  ≥0.85 one contains the other ("chips" in "kartoffelchips") — words of 5+ letters only
 *  ≥0.7  a typo or two apart, same first letter (only with `fuzzy`)
 *  0     not the same word
 * Short words (<5 letters) must match exactly, so "blum" can never be "blue". */
export function tokenSimilarity(a: string, b: string, fuzzy = true): number {
  if (a === b) return 1;
  const shorter = Math.min(a.length, b.length);
  const longer = Math.max(a.length, b.length);
  if (shorter < 5) return 0;
  if (a.includes(b) || b.includes(a)) return Math.max(0.85, shorter / longer);
  if (!fuzzy || a[0] !== b[0]) return 0;
  const maxDistance = longer >= 6 ? 2 : 1;
  if (longer - shorter > maxDistance) return 0;
  const distance = editDistance(a, b);
  if (distance > maxDistance) return 0;
  const similarity = 1 - distance / longer;
  return similarity >= MIN_TYPO_SIMILARITY ? similarity : 0;
}

export const tokensMatch = (a: string, b: string, fuzzy = true): boolean => tokenSimilarity(a, b, fuzzy) > 0;

/** One-typo match for the short question words ("hbat", "hapt" → "habt"),
 * which `tokenSimilarity` deliberately doesn't fuzz because of their length. */
export function isTypoOf(token: string, words: readonly string[]): boolean {
  return (
    token.length >= 4 &&
    words.some((word) => token[0] === word[0] && Math.abs(token.length - word.length) <= 1 && editDistance(token, word) <= 1)
  );
}

/** Does any token equal (or, for words of 5+ letters, differ by one typo from)
 * any of `words`? `words` must be written in normalized spelling. Stricter than
 * product matching on purpose: a wrongly detected topic is worse than a miss. */
export function hasWord(tokens: readonly string[], words: readonly string[]): boolean {
  return tokens.some((token) => words.some((word) => token === word || (word.length >= 5 && tokenSimilarity(token, word) >= 0.8)));
}

/** Exact-only variant, for small function words where fuzziness would misfire. */
export function hasExact(tokens: readonly string[], words: readonly string[]): boolean {
  return tokens.some((token) => words.includes(token));
}
