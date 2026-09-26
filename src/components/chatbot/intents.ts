// Intent detection: works out WHAT the user wants (opening hours, a product,
// the address …) plus its parameters, from the normalized message — never by
// comparing whole sentences. Trigger words live in data/synonyms.ts. To
// support a new topic: add words there, a detector here and a handler in
// chatbotEngine.ts.
import { KNOWLEDGE_BASE, type KnowledgeEntry } from '../../data/chatbotKnowledge';
import { INTENT_WORDS as W } from '../../data/synonyms';
import { isHoursIntent } from './conversationContext';
import { extractEntities, parseDay, type DayRef } from './entities';
import { hasExact, hasWord } from './fuzzySearch';
import { normalizeMessage } from './normalizer';
import type { HoursFocus, HoursQuestion } from './openingHours';
import { hasHit, searchSegment } from './productSearch';
import type { ChatContext, DetectedIntent, Entities, Intent } from './types';

const found = (intent: Intent, entities: Entities = {}, confidence = 0.9): DetectedIntent => ({ intent, entities, confidence });

const list = (words: readonly string[]): readonly string[] => words;

const hoursIntentFor = (focus: HoursFocus): Intent =>
  focus === 'close' ? 'closing_time' : focus === 'open' ? 'opening_time' : 'opening_hours';

// ---- Opening hours ------------------------------------------------------

function detectOpening(tokens: string[], day: DayRef | null, ctx: ChatContext, now: Date): DetectedIntent | null {
  const today = () => parseDay(['heute'], now);
  const asksWhen = tokens.includes('wann');
  const openWord = hasWord(tokens, W.open);
  const nowWord = hasExact(tokens, W.now);
  const isToday = !day || day.offset === 0;

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
    const opensWord = hasExact(tokens, W.openVerbs) || (asksWhen && hasExact(tokens, ['auf', 'ab']));
    const focus: HoursFocus = hasExact(tokens, W.close) ? 'close' : opensWord ? 'open' : 'both';
    const asksForSchedule = hasWord(tokens, W.schedule);

    // "Wie lange habt ihr noch offen?" → time left today.
    if (tokens.includes('lange') && nowWord && isToday) {
      return found('closing_time', { day: today(), focus: 'close', remaining: true }, 0.95);
    }
    if (nowWord && !asksWhen && !tokens.includes('bis') && !asksForSchedule && isToday) return found('open_now', {}, 0.95);
    if (!day && asksForSchedule) return found('opening_hours', { weekly: true, focus: 'both' }, 0.95);

    const yesNo = focus === 'both' && list(W.questionStarts).includes(tokens[0]) && !asksForSchedule;
    const question: HoursQuestion = yesNo ? (tokens.includes('geschlossen') ? 'closed' : 'yesNo') : 'plain';
    return found(
      hoursIntentFor(focus),
      { day: day ?? today(), focus, question, again: tokens.includes('wieder') && !day },
      0.95
    );
  }

  // "Und Sonntag?" right after an opening-hours answer: same question, other day.
  const dayFillers = list(W.dayFollowFillers);
  if (day && ctx.lastIntent && isHoursIntent(ctx.lastIntent) && tokens.every((token) => dayFillers.includes(token) || parseDay([token], now))) {
    const focus = ctx.lastFocus ?? 'both';
    return found(hoursIntentFor(focus), { day, focus, question: 'plain' }, 0.85);
  }
  return null;
}

// ---- Small talk -----------------------------------------------------------

function detectSocial(tokens: string[]): DetectedIntent | null {
  const fillers = list(W.socialFillers);
  const only = (words: readonly string[]) => tokens.every((token) => words.includes(token) || fillers.includes(token));
  const any = (words: readonly string[]) => tokens.some((token) => words.includes(token));
  const thanks = list(W.thanks);
  const goodbye = list(W.goodbye);
  const greeting = list(W.greeting);

  if (any(thanks) && only([...thanks, ...goodbye])) return found('thanks', {}, 0.95);
  if (any(goodbye) && only(goodbye)) return found('goodbye', {}, 0.95);
  if (any(greeting) && only(greeting)) {
    const kind = tokens.includes('abend') ? 'abend' : tokens.includes('morgen') && tokens.includes('guten') ? 'morgen' : undefined;
    return found('greeting', { greeting: kind }, 0.95);
  }
  return null;
}

/** Static topics (services, FAQ) — keyword scoring: longer, more specific
 * phrases outweigh short generic ones. */
function matchTopic(text: string): KnowledgeEntry | null {
  const input = normalizeMessage(text);
  let best: KnowledgeEntry | null = null;
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

// ---- Main ---------------------------------------------------------------

export function detectIntent(text: string, ctx: ChatContext, now: Date = new Date()): DetectedIntent {
  const { tokens, day, query } = extractEntities(text, now);
  if (!tokens.length) return found('unknown', {}, 0);

  // --- Short follow-ups that refer to the previous answer ---
  if (!query.segments.length) {
    const yes = hasExact(tokens, W.yes);
    if (ctx.offer === 'list' && ctx.lastProductIds?.length && (yes || query.listRequest)) {
      return found('product_variants', { fromContext: true }, 0.9);
    }
    if (query.priceRequest) return found('product_price', { fromContext: true }, 0.9);
    if (query.listRequest) return found('product_variants', { fromContext: true }, 0.9);
  }

  if (hasWord(tokens, W.help) || hasExact(tokens, ['kannst', 'helfen', 'hilfst'])) return found('help');

  const opening = detectOpening(tokens, day, ctx, now);
  if (opening) return opening;

  if (hasWord(tokens, W.phone)) return found('phone');
  if (hasWord(tokens, W.contact)) return found('contact');
  if (hasWord(tokens, W.payment) || (tokens.includes('karte') && hasExact(tokens, ['nehmt', 'akzeptiert', 'geht', 'moeglich', 'zahlen']))) {
    return found('payment_methods');
  }
  if (hasWord(tokens, W.parking)) return found('parking');
  if (hasWord(tokens, W.delivery)) return found('delivery');

  // --- Products: what the data knows about wins over the generic topics ---
  const fuzzy = query.availabilityAsked || query.listRequest || query.priceRequest;
  const results = query.segments.map((segment) => searchSegment(segment, fuzzy));
  const hits = results.filter(hasHit);

  if (hasWord(tokens, W.recommend)) {
    return found('recommendations', { query, results }, hits.length ? Math.min(...hits.map((hit) => hit.confidence)) : 0.9);
  }

  if (hits.length) {
    // "Und Monster?" after a price/variants question keeps asking the same thing.
    const carry = tokens[0] === 'und' ? ctx.lastIntent : undefined;
    const asksPrice = query.priceRequest || carry === 'product_price';
    const asksList = query.listRequest || carry === 'product_variants';
    const confidence = Math.min(...hits.map((hit) => hit.confidence));
    const single = results.length === 1 ? results[0] : null;

    let intent: Intent = 'product_search';
    if (single?.tagOnly) intent = 'recommendations';
    else if (asksPrice) intent = 'product_price';
    else if (single?.category) intent = 'product_category';
    else if (asksList) intent = 'product_variants';
    else if (query.availabilityAsked) intent = 'product_availability';
    return found(intent, { query, results }, confidence);
  }

  // --- Location ---
  if (hasWord(tokens, W.direction) || (tokens.includes('wie') && tokens.includes('komme'))) return found('directions');
  const place = list(W.place);
  const contentIsPlace = query.segments.every((segment) => segment.tokens.every((token) => place.includes(token)));
  if (hasWord(tokens, W.address) || (tokens.includes('wo') && hasExact(tokens, W.whereVerbs) && contentIsPlace)) return found('address');

  // --- Static topics (services, FAQ) ---
  const topic = matchTopic(text);
  if (topic) return found(topic.kind === 'faq' ? 'faq' : 'services', { topic }, 0.85);

  // "Habt ihr XYZ?" for something we don't know: an honest "not found" beats a shrug.
  if (query.segments.length && fuzzy) return found('product_search', { query, results }, 0);

  return detectSocial(tokens) ?? found('unknown', {}, 0);
}
