// Intent detection: works out WHAT the user wants (opening hours, a product,
// the address …) plus its parameters (which day, which product), from the
// normalized message — never by comparing whole sentences. To support a new
// topic, add a detector here and a handler in chatbotEngine.ts.
import { KNOWLEDGE_BASE } from '../../data/chatbotKnowledge';
import { parseDay, type HoursFocus, type HoursQuestion } from './openingHours';
import { hasHit, parseProductQuery, searchSegment } from './productSearch';
import { hasExact, hasWord, normalizeMessage, tokenize } from './text';
import type { ChatContext, DetectedIntent, Entities, Intent } from './types';

const found = (intent: Intent, entities: Entities = {}): DetectedIntent => ({ intent, entities });

// ---- Opening hours ------------------------------------------------------

const OPEN_WORDS = [
  'offen', 'geoeffnet', 'oeffnungszeit', 'oeffnungszeiten', 'oeffnungsuhrzeit', 'oeffnen', 'oeffnet', 'geschlossen',
  'schliesst', 'schliessen', 'zumachen', 'aufmachen', 'zeiten',
];
const SCHEDULE_WORDS = ['oeffnungszeit', 'oeffnungszeiten', 'oeffnungsuhrzeit', 'zeiten'];
const NOW_WORDS = ['gerade', 'jetzt', 'aktuell', 'momentan', 'noch', 'grad', 'derzeit'];
const CLOSE_WORDS = ['zu', 'zumachen', 'schliesst', 'schliessen', 'bis', 'lange', 'dicht', 'feierabend', 'schluss'];
const OPEN_VERBS = ['oeffnet', 'oeffnen', 'aufmachen', 'beginn'];
const QUESTION_STARTS = ['habt', 'seid', 'ist', 'hat', 'haben', 'sind', 'macht', 'hast'];
/** Words that may accompany a bare day in a follow-up like "Und morgen?". */
const DAY_FOLLOWUP_FILLERS = ['und', 'wie', 'ist', 'es', 'dann', 'aber', 'sieht', 'aus', 'mit', 'am', 'an', 'ihr'];

function detectOpening(tokens: string[], ctx: ChatContext, now: Date): DetectedIntent | null {
  const day = parseDay(tokens, now);
  const asksWhen = tokens.includes('wann');
  const openWord = hasWord(tokens, OPEN_WORDS);
  const nowWord = hasExact(tokens, NOW_WORDS);

  // "wann macht ihr auf/zu", "habt ihr heute auf" — but not "habt ihr … auf Lager".
  const openCloseVerb =
    hasExact(tokens, ['auf', 'zu']) &&
    hasExact(tokens, ['habt', 'macht', 'seid', 'hat']) &&
    !tokens.includes('lager') &&
    (asksWhen || day !== null || nowWord);
  const untilWhen = (tokens.includes('bis') || tokens.includes('ab')) && asksWhen;
  const howLong = tokens.includes('lange') && (day !== null || openWord);

  if (openWord || openCloseVerb || untilWhen || howLong) {
    // "auf" only means "when do you open" in "wann macht ihr auf"; "habt ihr heute auf?" asks yes/no.
    const opensWord = hasExact(tokens, OPEN_VERBS) || (asksWhen && hasExact(tokens, ['auf', 'ab']));
    const focus: HoursFocus = hasExact(tokens, CLOSE_WORDS) ? 'close' : opensWord ? 'open' : 'both';
    const asksForSchedule = hasWord(tokens, SCHEDULE_WORDS);

    if (nowWord && !asksWhen && !tokens.includes('bis') && !tokens.includes('lange') && !asksForSchedule && (!day || day.offset === 0)) {
      return found('open_now');
    }
    if (!day && asksForSchedule) return found('opening_hours', { weekly: true });

    const isYesNo = focus === 'both' && QUESTION_STARTS.includes(tokens[0]) && !asksForSchedule;
    const question: HoursQuestion = isYesNo ? (tokens.includes('geschlossen') ? 'closed' : 'yesNo') : 'plain';
    return found('opening_hours', { day: day ?? parseDay(['heute'], now), focus, question });
  }

  // "Und morgen?" right after an opening-hours answer.
  const afterHours = ctx.lastIntent === 'opening_hours' || ctx.lastIntent === 'open_now';
  if (afterHours && day && tokens.every((token) => DAY_FOLLOWUP_FILLERS.includes(token) || parseDay([token], now))) {
    return found('opening_hours', { day, focus: 'both', question: 'plain' });
  }
  return null;
}

// ---- Other topics ---------------------------------------------------------

const CONTACT_WORDS = ['telefon', 'telefonnummer', 'nummer', 'anrufen', 'handynummer', 'mail', 'email', 'kontakt', 'kontaktieren', 'erreichen', 'whatsapp'];
const PAYMENT_WORDS = ['zahlen', 'bezahlen', 'zahlung', 'kartenzahlung', 'barzahlung', 'paypal', 'girocard', 'mastercard', 'visa', 'kontaktlos', 'applepay', 'ec'];
const DIRECTION_WORDS = ['route', 'anfahrt', 'navigation', 'navi', 'maps', 'wegbeschreibung', 'anreise'];
const ADDRESS_WORDS = ['adresse', 'standort', 'strasse', 'anschrift'];
const WHERE_VERBS = ['seid', 'ist', 'liegt', 'finde', 'finden', 'befindet', 'sitzt', 'genau'];
/** "Wo ist …" only means our address when it isn't about a specific thing. */
const PLACE_WORDS = ['laden', 'kiosk', 'snackpoint', 'snack', 'point', 'geschaeft', 'shop', 'kaufbeuren', 'genau'];

const GREETING_WORDS = ['hallo', 'hi', 'hey', 'moin', 'servus', 'huhu', 'guten', 'tag', 'morgen', 'abend', 'gruess', 'gott'];
const GOODBYE_WORDS = ['tschuess', 'tschau', 'ciao', 'bye', 'wiedersehen', 'bald', 'dann', 'spaeter'];
const THANKS_WORDS = ['danke', 'dankeschoen', 'dank', 'vielen', 'merci', 'thx'];
const SOCIAL_FILLERS = ['wie', 'geht', 's', 'dir', 'euch', 'ihr', 'es', 'bis', 'auf', 'alle', 'zusammen', 'schoenen', 'noch', 'einen', 'sehr', 'super', 'ok'];

function detectSocial(tokens: string[]): DetectedIntent | null {
  const only = (words: readonly string[]) => tokens.every((token) => words.includes(token) || SOCIAL_FILLERS.includes(token));
  if (tokens.some((token) => THANKS_WORDS.includes(token)) && only([...THANKS_WORDS, ...GOODBYE_WORDS])) return found('thanks');
  if (tokens.some((token) => GOODBYE_WORDS.includes(token)) && only(GOODBYE_WORDS)) return found('goodbye');
  if (tokens.some((token) => GREETING_WORDS.includes(token)) && only(GREETING_WORDS)) return found('greeting');
  return null;
}

/** Static topics (sortiment, DHL, lotto) — keyword scoring: longer, more
 * specific phrases outweigh short generic ones. */
function matchTopic(text: string) {
  const input = normalizeMessage(text);
  let best = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const normalized = normalizeMessage(keyword);
      if (normalized && input.includes(normalized)) score += normalized.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

export function detectIntent(text: string, ctx: ChatContext, now: Date = new Date()): DetectedIntent {
  const tokens = tokenize(text);
  if (!tokens.length) return found('unknown');

  const query = parseProductQuery(text);

  // "Welche?" / "Welche Sorten?" — refers to the last product answer (or asks what we mean).
  if (query.listRequest && !query.segments.length) return found('product_followup');

  const opening = detectOpening(tokens, ctx, now);
  if (opening) return opening;

  if (hasWord(tokens, CONTACT_WORDS)) return found('contact');
  if (hasWord(tokens, PAYMENT_WORDS) || (tokens.includes('karte') && hasExact(tokens, ['nehmt', 'akzeptiert', 'geht', 'moeglich', 'zahlen']))) {
    return found('payment_methods');
  }

  // A product or category the data knows about wins over the generic topics.
  const fuzzy = query.availabilityAsked || query.listRequest;
  const results = query.segments.map((segment) => searchSegment(segment, fuzzy));
  if (results.some(hasHit)) {
    const intent = results.length === 1 && results[0].category ? 'product_category' : 'product_search';
    return found(intent, { query, results });
  }

  if (hasWord(tokens, DIRECTION_WORDS) || (tokens.includes('wie') && tokens.includes('komme'))) return found('directions');
  const contentIsPlace = query.segments.every((segment) => segment.tokens.every((token) => PLACE_WORDS.includes(token)));
  if (hasWord(tokens, ADDRESS_WORDS) || (tokens.includes('wo') && hasExact(tokens, WHERE_VERBS) && contentIsPlace)) {
    return found('address');
  }

  const topic = matchTopic(text);
  if (topic) return found('services', { topic });

  // "Habt ihr XYZ?" for something we don't know: an honest "not found" beats a shrug.
  if (query.segments.length && (query.availabilityAsked || query.listRequest)) {
    return found('product_search', { query, results });
  }

  return detectSocial(tokens) ?? found('unknown');
}
