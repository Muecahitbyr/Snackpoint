import type { ChatCTA, KnowledgeEntry } from '../../data/chatbotKnowledge';
import type { DayRef, HoursFocus, HoursQuestion } from './openingHours';
import type { ProductQuery, SegmentResult } from './productSearch';

export type Intent =
  | 'greeting'
  | 'goodbye'
  | 'thanks'
  | 'opening_hours'
  | 'open_now'
  | 'product_search'
  | 'product_category'
  | 'product_followup'
  | 'contact'
  | 'address'
  | 'directions'
  | 'services'
  | 'payment_methods'
  | 'unknown';

export interface BotReply {
  text: string;
  cta?: ChatCTA;
}

/** What the bot remembers between messages — just enough for "Welche?" and "Und morgen?". */
export interface ChatContext {
  lastIntent?: Intent;
  /** Products the last product answer was about. */
  lastProductIds?: string[];
}

/** Everything intent detection extracted from the message besides the intent itself. */
export interface Entities {
  day?: DayRef | null;
  focus?: HoursFocus;
  question?: HoursQuestion;
  weekly?: boolean;
  query?: ProductQuery;
  results?: SegmentResult[];
  topic?: KnowledgeEntry;
}

export interface DetectedIntent {
  intent: Intent;
  entities: Entities;
}
