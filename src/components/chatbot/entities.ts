// Entity extraction: pulls the parameters out of a message — which day is
// meant, which product words were used, and how the question was phrased
// (asking for availability, a list of variants, a price …).
import { INTENT_WORDS } from '../../data/synonyms';
import { hasExact, isTypoOf, tokensMatch } from './fuzzySearch';
import { isStopword, normalizeMessage, stem, tokenize } from './normalizer';

// ---- Days ---------------------------------------------------------------

export interface DayRef {
  jsDay: number;
  /** Days from today (0 = today). */
  offset: number;
  /** "Heute", "Morgen", "Samstag" … — sentence-initial capitalization. */
  label: string;
}

export const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAY_STEMS = WEEKDAYS.map((name) => stem(name.toLowerCase()));

function namedDay(jsDay: number, now: Date): DayRef {
  return { jsDay, offset: (jsDay - now.getDay() + 7) % 7, label: WEEKDAYS[jsDay] };
}

/** Finds a weekday name ("Samstag", "sonntags", typos tolerated) or
 * "heute" / "morgen" / "übermorgen" among the normalized tokens. A named
 * weekday wins over "heute" ("Ist heute Sonntag offen?"). */
export function parseDay(tokens: string[], now: Date): DayRef | null {
  for (const token of tokens) {
    if (token === 'sonnabend') return namedDay(6, now);
    const index = WEEKDAY_STEMS.findIndex((weekday) => tokensMatch(stem(token), weekday));
    if (index >= 0) return namedDay(index, now);
  }
  for (const token of tokens) {
    if (token === 'heute' || token === 'heut') return { jsDay: now.getDay(), offset: 0, label: 'Heute' };
    if (token === 'morgen') return { jsDay: (now.getDay() + 1) % 7, offset: 1, label: 'Morgen' };
    if (token === 'uebermorgen') return { jsDay: (now.getDay() + 2) % 7, offset: 2, label: 'Übermorgen' };
  }
  return null;
}

// ---- Product query ------------------------------------------------------

export interface QuerySegment {
  /** What the user asked for, in their own words, fillers removed. */
  display: string;
  tokens: string[];
  stems: string[];
}

export interface ProductQuery {
  /** "Cola und Chips" → two segments, each searched on its own. */
  segments: QuerySegment[];
  /** "Welche …?", "Sorten" — the user wants the actual list. */
  listRequest: boolean;
  priceRequest: boolean;
  /** "Habt ihr …", "gibt es …", "… da?" — as opposed to just naming a product. */
  availabilityAsked: boolean;
}

export function parseProductQuery(raw: string): ProductQuery {
  const allTokens = tokenize(raw);
  const segments: QuerySegment[] = [];

  for (const chunk of raw.split(/,|;|&|\+|\bund\b|\boder\b/i)) {
    const words = chunk.split(/\s+/).filter(Boolean);
    const shown = words.filter((word) => !isStopword(normalizeMessage(word)));
    const tokens = tokenize(chunk).filter((token) => !isStopword(token));
    if (!tokens.length) continue;
    segments.push({
      display: shown.join(' ').replace(/[?!.]+$/, ''),
      tokens,
      stems: tokens.map(stem),
    });
  }

  return {
    segments,
    listRequest: hasExact(allTokens, INTENT_WORDS.list),
    priceRequest: hasExact(allTokens, INTENT_WORDS.price),
    availabilityAsked: hasExact(allTokens, INTENT_WORDS.availability) || allTokens.some((token) => isTypoOf(token, ['habt', 'gibt'])),
  };
}

// ---- Everything at once ---------------------------------------------------

export interface ExtractedEntities {
  tokens: string[];
  day: DayRef | null;
  query: ProductQuery;
}

export function extractEntities(text: string, now: Date): ExtractedEntities {
  const tokens = tokenize(text);
  return { tokens, day: parseDay(tokens, now), query: parseProductQuery(text) };
}
