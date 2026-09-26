// Session memory: what the last answer was about, so short follow-ups
// ("Welche?", "Was kosten die?", "Und Sonntag?", "ja") can be understood.
// Lives in memory for the open chat only — nothing is stored or sent anywhere.
import type { ChatContext, DetectedIntent, Intent } from './types';

const PRODUCT_INTENTS: Intent[] = [
  'product_search',
  'product_category',
  'product_variants',
  'product_price',
  'product_availability',
  'recommendations',
];
const HOURS_INTENTS: Intent[] = ['opening_hours', 'open_now', 'closing_time', 'opening_time'];
/** Small talk shouldn't make the bot forget what "Welche?" refers to. */
const KEEPS_PRODUCTS: Intent[] = ['greeting', 'thanks'];

export const isProductIntent = (intent: Intent): boolean => PRODUCT_INTENTS.includes(intent);
export const isHoursIntent = (intent: Intent): boolean => HOURS_INTENTS.includes(intent);

export interface AnswerMemory {
  productIds?: string[];
  categoryId?: string;
  offer?: ChatContext['offer'];
}

export function nextContext(prev: ChatContext, detected: DetectedIntent, memory: AnswerMemory): ChatContext {
  const { intent, entities } = detected;
  const next: ChatContext = { lastIntent: intent };

  if (isProductIntent(intent)) {
    next.lastProductIds = memory.productIds;
    next.lastCategoryId = memory.categoryId;
    next.offer = memory.offer;
  } else if (KEEPS_PRODUCTS.includes(intent)) {
    next.lastProductIds = prev.lastProductIds;
    next.lastCategoryId = prev.lastCategoryId;
    next.offer = prev.offer;
  }

  if (isHoursIntent(intent)) {
    next.lastDay = entities.day ?? prev.lastDay;
    next.lastFocus = entities.focus ?? prev.lastFocus;
  } else {
    next.lastDay = prev.lastDay;
    next.lastFocus = prev.lastFocus;
  }
  if (intent === 'services' || intent === 'faq') next.lastTopic = entities.topic?.id;
  return next;
}
