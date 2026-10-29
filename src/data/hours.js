// Weekly opening hours, Monday-first for display. Maintained in the admin
// panel and filled in from the database when the page loads.
// `jsDay` is the value `new Date().getDay()` returns for that day (0 = Sunday).
export const OPENING_HOURS = [];

// Days that differ from the weekly plan (holidays, closures, short days),
// upcoming only: { date: 'YYYY-MM-DD', closed, open, close, note }.
export const SPECIAL_HOURS = [];

export function setOpeningHours(hours, specialHours = []) {
  OPENING_HOURS.splice(0, OPENING_HOURS.length, ...hours);
  SPECIAL_HOURS.splice(0, SPECIAL_HOURS.length, ...specialHours);
}

/** "YYYY-MM-DD" of a date in the visitor's time zone. */
export function dateKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** The hours that apply on this calendar day: a special day if there is one, otherwise the weekly plan. */
export function hoursOn(date) {
  const weekly = OPENING_HOURS.find((entry) => entry.jsDay === date.getDay()) ?? null;
  const special = SPECIAL_HOURS.find((entry) => entry.date === dateKey(date));
  if (!special) return weekly;
  return { day: weekly?.day ?? '', jsDay: date.getDay(), open: special.open, close: special.close, closed: special.closed, note: special.note, special: true };
}

export function getTodayHours(date = new Date()) {
  return hoursOn(date);
}

/** Special days from `from` on, at most `days` days ahead. */
export function upcomingSpecialHours(from = new Date(), days = 366) {
  const first = dateKey(from);
  const last = dateKey(addDays(from, days));
  return SPECIAL_HOURS.filter((entry) => entry.date >= first && entry.date <= last);
}
