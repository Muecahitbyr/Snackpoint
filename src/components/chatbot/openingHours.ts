// Opening-hours FACTS: is the shop open right now, until when, when does it
// open next, what are the hours on a given day. Reads the same OPENING_HOURS
// the website's location section uses, so hours are maintained in one place
// (data/hours.js). No wording here — responseBuilder.ts turns these facts into
// sentences.
import { OPENING_HOURS } from '../../data/hours';
import { WEEKDAYS, type DayRef } from './entities';

/** What the user wants to know: when we open, when we close, or both. */
export type HoursFocus = 'open' | 'close' | 'both';

/** How the question was phrased: "Wann …?" (plain), "Habt ihr … offen?"
 * (yes/no) or "Habt ihr … geschlossen?" (a yes/no about being closed). */
export type HoursQuestion = 'plain' | 'yesNo' | 'closed';

interface HoursEntry {
  day: string;
  jsDay: number;
  open: string;
  close: string;
  closed: boolean;
}

/** The next time we open: "heute" / "morgen" / "am Montag", plus the time. */
export interface NextOpening {
  when: string;
  time: string;
}

export interface OpenStatus {
  open: boolean;
  /** Closing time, when open now. */
  closesAt?: string;
  minutesLeft?: number;
  /** The next opening after now (null if the hours never open). */
  next: NextOpening | null;
}

export interface DayFact {
  day: DayRef;
  closed: boolean;
  open?: string;
  close?: string;
  /** Today's opening hours are already over. */
  over: boolean;
  /** Today, and we've already opened. */
  alreadyOpen: boolean;
  status: OpenStatus;
}

export interface WeekGroup {
  /** First and last weekday of a run of identical days. */
  first: string;
  last: string;
  count: number;
  closed: boolean;
  open: string;
  close: string;
}

const hoursFor = (jsDay: number): HoursEntry | undefined =>
  (OPENING_HOURS as HoursEntry[]).find((entry) => entry.jsDay === jsDay);

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesOf = (now: Date): number => now.getHours() * 60 + now.getMinutes();

function whenPhrase(offset: number, jsDay: number): string {
  if (offset === 0) return 'heute';
  if (offset === 1) return 'morgen';
  return `am ${WEEKDAYS[jsDay]}`;
}

/** The next time we open after `now`. */
function nextOpening(now: Date): NextOpening | null {
  const minutes = minutesOf(now);
  for (let offset = 0; offset < 8; offset++) {
    const jsDay = (now.getDay() + offset) % 7;
    const hours = hoursFor(jsDay);
    if (!hours || hours.closed) continue;
    if (offset === 0 && minutes >= toMinutes(hours.open)) continue;
    return { when: whenPhrase(offset, jsDay), time: hours.open };
  }
  return null;
}

/** Open right now? Handles closing times past midnight (close <= open). */
export function getOpenStatus(now: Date): OpenStatus {
  const next = nextOpening(now);
  const minutes = minutesOf(now);
  const today = hoursFor(now.getDay());
  if (today && !today.closed) {
    const opens = toMinutes(today.open);
    const closes = toMinutes(today.close);
    if (closes > opens ? minutes >= opens && minutes < closes : minutes >= opens) {
      return { open: true, closesAt: today.close, minutesLeft: (closes > minutes ? closes : closes + 1440) - minutes, next };
    }
  }
  const yesterday = hoursFor((now.getDay() + 6) % 7);
  if (yesterday && !yesterday.closed && toMinutes(yesterday.close) <= toMinutes(yesterday.open) && minutes < toMinutes(yesterday.close)) {
    return { open: true, closesAt: yesterday.close, minutesLeft: toMinutes(yesterday.close) - minutes, next };
  }
  return { open: false, next };
}

/** Hours on the given day, and — for today — where we are in them. */
export function getDayFact(day: DayRef, now: Date): DayFact {
  const hours = hoursFor(day.jsDay);
  const status = getOpenStatus(now);
  if (!hours || hours.closed) return { day, closed: true, over: false, alreadyOpen: false, status };

  const isToday = day.offset === 0;
  const overnight = toMinutes(hours.close) <= toMinutes(hours.open);
  return {
    day,
    closed: false,
    open: hours.open,
    close: hours.close,
    over: isToday && !status.open && !overnight && minutesOf(now) >= toMinutes(hours.close),
    alreadyOpen: isToday && minutesOf(now) >= toMinutes(hours.open),
    status,
  };
}

/** The whole week, with identical consecutive days merged ("Montag – Freitag"). */
export function getWeekFact(): WeekGroup[] {
  const groups: WeekGroup[] = [];
  for (const entry of OPENING_HOURS as HoursEntry[]) {
    const last = groups[groups.length - 1];
    if (last && last.closed === entry.closed && last.open === entry.open && last.close === entry.close) {
      last.last = entry.day;
      last.count += 1;
    } else {
      groups.push({ first: entry.day, last: entry.day, count: 1, closed: entry.closed, open: entry.open, close: entry.close });
    }
  }
  return groups;
}
