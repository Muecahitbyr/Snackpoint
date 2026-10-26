// Event dates are shown in the shop's time zone, whatever the visitor's is.
const TZ = 'Europe/Berlin';
const fmt = (options) => new Intl.DateTimeFormat('de-DE', { timeZone: TZ, ...options });
const DAY = fmt({ day: '2-digit' });
const MONTH = fmt({ month: 'short' });
const DATE = fmt({ weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
const TIME = fmt({ hour: '2-digit', minute: '2-digit' });
// "2026-11-07" in the shop's time zone (en-CA formats dates as YYYY-MM-DD).
const DAY_KEY = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const PRICE = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function dateBadge(iso) {
  const date = new Date(iso);
  return { day: DAY.format(date), month: MONTH.format(date).replace('.', '').toUpperCase() };
}

/** "Sa., 31.10.2026 · 18:00–22:00 Uhr", or both dates for multi-day events. */
export function eventWhen(event) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  if (!end) return `${DATE.format(start)} · ${TIME.format(start)} Uhr`;
  if (DAY_KEY.format(start) === DAY_KEY.format(end)) {
    return `${DATE.format(start)} · ${TIME.format(start)}–${TIME.format(end)} Uhr`;
  }
  return `${DATE.format(start)}, ${TIME.format(start)} Uhr – ${DATE.format(end)}, ${TIME.format(end)} Uhr`;
}

/** "Eintritt frei", "Eintritt: 5,00 €" or the free-text note. */
export function eventPrice(event) {
  if (event.price === null || event.price === undefined) return event.priceNote || '';
  const base = event.price === 0 ? 'Eintritt frei' : `Eintritt: ${PRICE.format(event.price / 100)}`;
  return event.priceNote ? `${base} · ${event.priceNote}` : base;
}

const WEEKDAY = fmt({ weekday: 'long' });
const DATE_LONG = fmt({ day: 'numeric', month: 'long', year: 'numeric' });

/** "Samstag, 7. November 2026" */
export function eventDayLong(iso) {
  const date = new Date(iso);
  return `${WEEKDAY.format(date)}, ${DATE_LONG.format(date)}`;
}

/** "15:00 – 19:00 Uhr" (or just the start time). */
export function eventTimeRange(event) {
  const start = TIME.format(new Date(event.startsAt));
  if (!event.endsAt) return `ab ${start} Uhr`;
  const end = new Date(event.endsAt);
  const sameDay = DAY_KEY.format(new Date(event.startsAt)) === DAY_KEY.format(end);
  return sameDay ? `${start} – ${TIME.format(end)} Uhr` : `${start} Uhr – ${DATE.format(end)}, ${TIME.format(end)} Uhr`;
}

// Whole days between two dates in the shop's time zone.
const dayNumber = (date) => {
  const [y, m, d] = DAY_KEY.format(date).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

/** "Läuft gerade" / "Heute" / "Morgen" / "In 5 Tagen" — or null once it's over. */
export function eventCountdown(event, now = new Date()) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  // Started and not over yet (without an end time: until midnight).
  if (start <= now && (end ? end > now : dayNumber(start) === dayNumber(now))) return 'Läuft gerade';
  const days = dayNumber(start) - dayNumber(now);
  if (days < 0) return null;
  if (days === 0) return 'Heute';
  if (days === 1) return 'Morgen';
  return `In ${days} Tagen`;
}

const icsText = (text) => String(text ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);
const icsDate = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Downloads an .ics file so the event lands in the visitor's calendar. */
export function downloadCalendarFile(event, fallbackLocation) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 2 * 3600 * 1000);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SnackPoint Kaufbeuren//Events//DE',
    'BEGIN:VEVENT',
    `UID:${event.id}@snackpoint`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(event.description)}`,
    `LOCATION:${icsText([event.location, fallbackLocation].filter(Boolean).join(', '))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^\wäöüÄÖÜß -]/g, '').trim() || 'event'}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
