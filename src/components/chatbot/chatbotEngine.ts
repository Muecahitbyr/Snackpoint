// Chat brain: detects the intent of a message and builds the reply from the
// site's own data. No external AI, no network — everything is local and
// deterministic (apart from harmless wording variants).
//
//   message ──► detectIntent (intents.ts) ──► handler below ──► reply + updated context
//
// Adding a topic = trigger words in data/synonyms.ts + a detector in
// intents.ts + one entry in HANDLERS.
import { nextContext, type AnswerMemory } from './conversationContext';
import { detectIntent } from './intents';
import { answerHoursForDay, answerOpenNow, answerReopening, answerWeek } from './openingHours';
import {
  addressReply,
  buildProductAnswer,
  contactReply,
  deliveryReply,
  directionsReply,
  goodbyeReply,
  greetingReply,
  helpReply,
  parkingReply,
  paymentReply,
  phoneReply,
  quickRepliesFor,
  thanksReply,
  unknownReply,
  type Rng,
} from './responseBuilder';
import type { BotReply, ChatContext, DetectedIntent, Intent } from './types';

interface HandlerResult {
  reply: BotReply;
  /** Set by product answers so follow-ups know what the answer was about. */
  memory?: AnswerMemory;
}

type Handler = (detected: DetectedIntent, ctx: ChatContext, now: Date, rng: Rng) => HandlerResult;

const withQuickReplies = (intent: Intent, reply: BotReply): BotReply => ({ ...reply, quickReplies: quickRepliesFor(intent) });

const hours =
  (intent: Intent): Handler =>
  ({ entities }, _ctx, now, rng) => {
    if (intent === 'open_now') return { reply: withQuickReplies(intent, answerOpenNow(now, rng)) };
    if (entities.weekly || !entities.day) return { reply: withQuickReplies(intent, answerWeek()) };
    if (entities.remaining) return { reply: withQuickReplies(intent, answerOpenNow(now, rng, true)) };
    if (entities.again) return { reply: withQuickReplies(intent, answerReopening(now)) };
    const day = entities.day;
    return { reply: withQuickReplies(intent, answerHoursForDay(day, entities.focus ?? 'both', entities.question ?? 'plain', now)) };
  };

const product =
  (intent: Intent): Handler =>
  ({ entities }, ctx, _now, rng) => {
    const { productIds, categoryId, offer, ...reply } = buildProductAnswer(intent, entities, ctx, rng);
    return { reply, memory: { productIds, categoryId, offer } };
  };

const staticReply =
  (build: () => BotReply): Handler =>
  () => ({ reply: build() });

const topic =
  (intent: Intent): Handler =>
  ({ entities }) => ({
    reply: { text: entities.topic?.getResponse() ?? '', cta: entities.topic?.cta, quickReplies: quickRepliesFor(intent) },
  });

const HANDLERS: Record<Intent, Handler> = {
  greeting: ({ entities }, _ctx, _now, rng) => ({ reply: greetingReply(entities.greeting, rng) }),
  goodbye: (_d, _c, _n, rng) => ({ reply: goodbyeReply(rng) }),
  thanks: (_d, _c, _n, rng) => ({ reply: thanksReply(rng) }),
  help: staticReply(helpReply),
  unknown: (_d, _c, _n, rng) => ({ reply: unknownReply(rng) }),

  opening_hours: hours('opening_hours'),
  open_now: hours('open_now'),
  closing_time: hours('closing_time'),
  opening_time: hours('opening_time'),

  product_search: product('product_search'),
  product_category: product('product_category'),
  product_variants: product('product_variants'),
  product_price: product('product_price'),
  product_availability: product('product_availability'),
  recommendations: product('recommendations'),

  address: staticReply(addressReply),
  directions: staticReply(directionsReply),
  phone: staticReply(phoneReply),
  contact: staticReply(contactReply),
  payment_methods: staticReply(paymentReply),
  delivery: staticReply(deliveryReply),
  parking: staticReply(parkingReply),

  services: topic('services'),
  faq: topic('faq'),
};

export interface EngineResult {
  reply: BotReply;
  context: ChatContext;
  /** What was understood — for tests and the dev-mode console. */
  debug: { intent: Intent; entities: DetectedIntent['entities']; confidence: number; matchedProducts: string[] };
}

export function respond(text: string, ctx: ChatContext = {}, now: Date = new Date(), rng: Rng = Math.random): EngineResult {
  const detected = detectIntent(text, ctx, now);
  const result = HANDLERS[detected.intent](detected, ctx, now, rng);
  const context = nextContext(ctx, detected, result.memory ?? {});

  const matchedProducts = (detected.entities.results ?? []).flatMap((entry) =>
    entry.products.map((product) => product.name ?? `${product.brand} ${product.variant}`)
  );
  const debug = { intent: detected.intent, entities: detected.entities, confidence: detected.confidence, matchedProducts };

  // Development only: Vite replaces import.meta.env.DEV with false in the production build.
  if (import.meta.env?.DEV) console.debug('[SnackBot]', text, debug);

  return { reply: result.reply, context, debug };
}
