import type { ChatCTA, KnowledgeEntry } from '../../data/chatbotKnowledge';
import type { DayRef, ProductQuery } from './entities';
import type { HoursFocus, HoursQuestion } from './openingHours';
import type { SegmentResult } from './productSearch';

export type Intent =
  | 'greeting'
  | 'goodbye'
  | 'thanks'
  | 'help'
  | 'opening_hours'
  | 'open_now'
  | 'closing_time'
  | 'opening_time'
  | 'product_search'
  | 'product_category'
  | 'product_variants'
  | 'product_price'
  | 'product_availability'
  | 'recommendations'
  | 'address'
  | 'directions'
  | 'phone'
  | 'contact'
  | 'payment_methods'
  | 'services'
  | 'delivery'
  | 'parking'
  | 'faq'
  | 'unknown';

/** A suggested next question, shown as a chip; `query` is answered as if typed. */
export interface QuickReply {
  label: string;
  query: string;
}

export interface BotReply {
  text: string;
  cta?: ChatCTA;
  quickReplies?: QuickReply[];
}

/** What the bot remembers within one chat session (memory only, never stored or sent). */
export interface ChatContext {
  lastIntent?: Intent;
  /** Products the last product answer was about — "Welche?", "Was kosten die?". */
  lastProductIds?: string[];
  lastCategoryId?: string;
  /** Last static topic answered (services / FAQ id). */
  lastTopic?: string;
  /** Last day asked about — "Und Sonntag?". */
  lastDay?: DayRef;
  lastFocus?: HoursFocus;
  /** The bot offered something a plain "ja" accepts ("Soll ich alle Sorten zeigen?"). */
  offer?: 'list';
}

/** Everything intent detection extracted from the message besides the intent itself. */
export interface Entities {
  day?: DayRef | null;
  focus?: HoursFocus;
  question?: HoursQuestion;
  weekly?: boolean;
  /** "Wie lange noch?" — answer with the time left today. */
  remaining?: boolean;
  /** "Wann macht ihr wieder auf?" */
  again?: boolean;
  query?: ProductQuery;
  results?: SegmentResult[];
  /** The message referred back to the previous product answer ("Welche?"). */
  fromContext?: boolean;
  topic?: KnowledgeEntry;
  /** "Guten Morgen" / "Guten Abend" — for a matching greeting. */
  greeting?: 'morgen' | 'abend';
}

export interface DetectedIntent {
  intent: Intent;
  entities: Entities;
  /** 0–1 how sure the detection is. Product matches carry their match quality. */
  confidence: number;
}
