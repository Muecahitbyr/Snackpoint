// Opening-hours questions: which day is meant, whether we're open right now,
// and natural-language answers. Reads the same OPENING_HOURS the website's
// location section uses, so hours are maintained in one place (data/hours.js).
import { OPENING_HOURS } from '../../data/hours';
import { stem, tokensMatch } from './text';
import type { BotReply } from './types';

/** What the user wants to know: when we open, when we close, or both. */
export type HoursFocus = 'open' | 'close' | 'both';

/** How the question was phrased: "Wann …?" (plain), "Habt ihr … offen?"
 * (yes/no) or "Habt ihr … geschlossen?" (a yes/no about being closed). */
export type HoursQuestion = 'plain' | 'yesNo' | 'closed';

export interface DayRef {
  jsDay: number;
  /** Days from today (0 = today). */
  offset: number;
  /** "Heute", "Morgen", "Samstag" … — sentence-initial capitalization. */
  label: string;
}

interface HoursEntry {
  day: string;
  jsDay: number;
  open: string;
  close: string;
  closed: boolean;
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAY_STEMS = WEEKDAYS.map((name) => stem(name.toLowerCase()));
const OPENING_CTA = { label: 'Öffnungszeiten ansehen', href: '#location' };

const hoursFor = (jsDay: number): HoursEntry | undefined =>
  (OPENING_HOURS as HoursEntry[]).find((entry) => entry.jsDay === jsDay);

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Finds "heute", "morgen", "übermorgen" or a weekday name ("Samstag",
 * "sonntags", typos tolerated) among the normalized tokens. */
export function parseDay(tokens: string[], now: Date): DayRef | null {
  // A named weekday is more specific than "heute" ("Ist heute Sonntag offen?").
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

function namedDay(jsDay: number, now: Date): DayRef {
  return { jsDay, offset: (jsDay - now.getDay() + 7) % 7, label: WEEKDAYS[jsDay] };
}

/** "heute" / "morgen" / "am Montag" — for "… öffnen wir wieder <hier> um 08:00 Uhr". */
function whenPhrase(offset: number, jsDay: number): string {
  if (offset === 0) return 'heute';
  if (offset === 1) return 'morgen';
  return `am ${WEEKDAYS[jsDay]}`;
}

function minutesOf(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** Open right now? Handles closing times past midnight (close <= open). */
function isOpenNow(now: Date): { open: boolean; closesAt?: string } {
  const minutes = minutesOf(now);
  const today = hoursFor(now.getDay());
  if (today && !today.closed) {
    const opens = toMinutes(today.open);
    const closes = toMinutes(today.close);
    if (closes > opens ? minutes >= opens && minutes < closes : minutes >= opens) {
      return { open: true, closesAt: today.close };
    }
  }
  const yesterday = hoursFor((now.getDay() + 6) % 7);
  if (yesterday && !yesterday.closed && toMinutes(yesterday.close) <= toMinutes(yesterday.open) && minutes < toMinutes(yesterday.close)) {
    return { open: true, closesAt: yesterday.close };
  }
  return { open: false };
}

/** The next time we open after `now`, as "heute um 08:00 Uhr" / "morgen um …" / "am Montag um …". */
function nextOpening(now: Date): string | null {
  const minutes = minutesOf(now);
  for (let offset = 0; offset < 8; offset++) {
    const jsDay = (now.getDay() + offset) % 7;
    const hours = hoursFor(jsDay);
    if (!hours || hours.closed) continue;
    if (offset === 0 && minutes >= toMinutes(hours.open)) continue;
    return `${whenPhrase(offset, jsDay)} um ${hours.open} Uhr`;
  }
  return null;
}

const nextOpeningSentence = (now: Date): string => {
  const next = nextOpening(now);
  return next ? ` Wir öffnen wieder ${next}.` : '';
};

export function answerOpenNow(now: Date): BotReply {
  const status = isOpenNow(now);
  if (status.open) {
    return { text: `Ja, wir haben gerade geöffnet und sind heute noch bis ${status.closesAt} Uhr für dich da. 😊`, cta: OPENING_CTA };
  }
  return { text: `Nein, aktuell haben wir geschlossen.${nextOpeningSentence(now)}`, cta: OPENING_CTA };
}

export function answerHoursForDay(day: DayRef, focus: HoursFocus, question: HoursQuestion, now: Date): BotReply {
  const hours = hoursFor(day.jsDay);
  const lead = day.label; // already capitalized for sentence start

  if (!hours || hours.closed) {
    const text =
      question === 'yesNo'
        ? `Nein, ${day.label} haben wir geschlossen.`
        : question === 'closed'
          ? `Ja, ${day.label} haben wir geschlossen.`
          : `${lead} haben wir geschlossen.`;
    return { text: day.offset === 0 ? `${text}${nextOpeningSentence(now)}` : text, cta: OPENING_CTA };
  }

  // Today's hours are already over: say so instead of talking about the future.
  const over = day.offset === 0 && !isOpenNow(now).open && minutesOf(now) >= toMinutes(hours.close);
  if (over && toMinutes(hours.close) > toMinutes(hours.open)) {
    return { text: `Heute hatten wir bis ${hours.close} Uhr geöffnet, jetzt haben wir geschlossen.${nextOpeningSentence(now)}`, cta: OPENING_CTA };
  }

  let text: string;
  if (focus === 'close') text = `${lead} haben wir bis ${hours.close} Uhr geöffnet.`;
  else if (focus === 'open') {
    const alreadyOpen = day.offset === 0 && minutesOf(now) >= toMinutes(hours.open);
    text = alreadyOpen ? `Heute haben wir ab ${hours.open} Uhr geöffnet.` : `${lead} öffnen wir um ${hours.open} Uhr.`;
  } else {
    text = `${lead} sind wir von ${hours.open} bis ${hours.close} Uhr für dich da.`;
  }
  const prefix = question === 'yesNo' ? 'Ja 😊 ' : question === 'closed' ? 'Nein 😊 ' : '';
  return { text: `${prefix}${text}`, cta: OPENING_CTA };
}

/** Whole week, with identical consecutive days merged ("Montag – Freitag"). */
export function answerWeek(): BotReply {
  const groups: HoursEntry[][] = [];
  for (const entry of OPENING_HOURS as HoursEntry[]) {
    const last = groups[groups.length - 1];
    const same = last && last[0].closed === entry.closed && last[0].open === entry.open && last[0].close === entry.close;
    if (same) last.push(entry);
    else groups.push([entry]);
  }

  const timeText = (entry: HoursEntry) => (entry.closed ? 'geschlossen' : `${entry.open} – ${entry.close} Uhr`);
  if (groups.length === 1) {
    const [entry] = groups[0];
    const text = entry.closed ? 'Wir haben aktuell geschlossen.' : `Wir haben täglich von ${entry.open} bis ${entry.close} Uhr geöffnet. 😊`;
    return { text, cta: OPENING_CTA };
  }

  const lines = groups.map((group) => {
    const first = group[0].day;
    const last = group[group.length - 1].day;
    const days = group.length === 1 ? first : group.length === 2 ? `${first} & ${last}` : `${first} – ${last}`;
    return `• ${days}: ${timeText(group[0])}`;
  });
  return { text: `Unsere Öffnungszeiten:\n${lines.join('\n')}`, cta: OPENING_CTA };
}
