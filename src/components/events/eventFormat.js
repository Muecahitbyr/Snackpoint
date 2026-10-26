// Event dates are shown in the shop's time zone, whatever the visitor's is.
const TZ = 'Europe/Berlin';
const fmt = (options) => new Intl.DateTimeFormat('de-DE', { timeZone: TZ, ...options });
const DAY = fmt({ day: '2-digit' });
const MONTH = fmt({ month: 'short' });
const DATE = fmt({ weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
const TIME = fmt({ hour: '2-digit', minute: '2-digit' });
const DAY_KEY = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });
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
