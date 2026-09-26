// Chat brain: detects the intent of a message and builds the reply from the
// site's own data. No external AI — everything is local and deterministic.
//
//   message ──► detectIntent (intents.ts) ──► handler below ──► reply + updated context
//
// Adding a topic = one detector in intents.ts + one entry in HANDLERS.
import { ADDRESS, CONTACT, MAPS_URL, PAYMENT_METHODS } from '../../data/constants';
import { FALLBACK_MESSAGE } from '../../data/chatbotKnowledge';
import { detectIntent } from './intents';
import { answerHoursForDay, answerOpenNow, answerWeek } from './openingHours';
import { answerFollowUp, answerProductQuery } from './productSearch';
import type { BotReply, ChatContext, DetectedIntent, Intent } from './types';

const ROUTE_CTA = { label: 'Route öffnen', href: MAPS_URL, external: true };
const ASK_IN_STORE = 'Frag am besten kurz unser Team vor Ort. 😊';

interface HandlerResult {
  reply: BotReply;
  /** Set by product answers so "Welche?" knows what the last answer was about. */
  productIds?: string[];
}

type Handler = (detected: DetectedIntent, ctx: ChatContext, now: Date) => HandlerResult;

const reply = (text: string, cta?: BotReply['cta']): HandlerResult => ({ reply: { text, cta } });

const HANDLERS: Record<Intent, Handler> = {
  greeting: () => reply('Hallo 😊 Wie kann ich dir helfen? Frag mich z. B. nach Produkten, Öffnungszeiten oder DHL.'),
  goodbye: () => reply('Bis bald! 😊 Schau gern wieder vorbei.'),
  thanks: () => reply('Sehr gerne! 😊 Sag Bescheid, wenn du noch etwas wissen möchtest.'),

  open_now: (_, __, now) => ({ reply: answerOpenNow(now) }),
  opening_hours: ({ entities }, _, now) => ({
    reply: entities.weekly || !entities.day ? answerWeek() : answerHoursForDay(entities.day, entities.focus ?? 'both', entities.question ?? 'plain', now),
  }),

  product_search: ({ entities }) => productReply(entities.query, entities.results),
  product_category: ({ entities }) => productReply(entities.query, entities.results),
  product_followup: (_, ctx) => ({
    reply: answerFollowUp(ctx.lastProductIds ?? []),
    productIds: ctx.lastProductIds,
  }),

  address: () => reply(`Du findest uns in der ${ADDRESS}. 😊`, ROUTE_CTA),
  directions: () => reply(`Wir sind in der ${ADDRESS}. Die Route findest du hier:`, ROUTE_CTA),

  contact: () => {
    const details = [CONTACT.phone && `Telefon: ${CONTACT.phone}`, CONTACT.email && `E-Mail: ${CONTACT.email}`].filter(Boolean);
    if (details.length) return reply(`So erreichst du uns:\n${details.join('\n')}`);
    return reply(`Eine Telefonnummer oder E-Mail-Adresse habe ich leider nicht hinterlegt. Komm gern direkt vorbei: ${ADDRESS}. 😊`, ROUTE_CTA);
  },
  payment_methods: () => {
    if (PAYMENT_METHODS.length) return reply(`Bei uns kannst du bezahlen mit: ${PAYMENT_METHODS.join(', ')}. 😊`);
    return reply(`Welche Zahlungsarten wir genau anbieten, weiß ich leider nicht sicher. ${ASK_IN_STORE}`);
  },

  services: ({ entities }) => reply(entities.topic?.getResponse() ?? FALLBACK_MESSAGE, entities.topic?.cta),
  unknown: () => reply(FALLBACK_MESSAGE),
};

function productReply(query: DetectedIntent['entities']['query'], results: DetectedIntent['entities']['results']): HandlerResult {
  if (!query || !results) return reply(FALLBACK_MESSAGE);
  const { productIds, ...botReply } = answerProductQuery(query, results);
  return { reply: botReply, productIds };
}

const PRODUCT_INTENTS: Intent[] = ['product_search', 'product_category', 'product_followup'];
/** Small talk shouldn't make the bot forget what "Welche?" refers to. */
const KEEPS_CONTEXT: Intent[] = ['greeting', 'thanks'];

export function respond(text: string, ctx: ChatContext = {}, now: Date = new Date()): { reply: BotReply; context: ChatContext } {
  const detected = detectIntent(text, ctx, now);
  const result = HANDLERS[detected.intent](detected, ctx, now);

  const lastProductIds = PRODUCT_INTENTS.includes(detected.intent)
    ? result.productIds
    : KEEPS_CONTEXT.includes(detected.intent)
      ? ctx.lastProductIds
      : undefined;

  return { reply: result.reply, context: { lastIntent: detected.intent, lastProductIds } };
}
