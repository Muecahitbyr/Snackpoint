// Weekly opening hours, Monday-first for display.
// `jsDay` is the value `new Date().getDay()` returns for that day (0 = Sunday).
export const OPENING_HOURS = [
  { day: 'Montag', jsDay: 1, open: '08:00', close: '20:00', closed: false },
  { day: 'Dienstag', jsDay: 2, open: '08:00', close: '20:00', closed: false },
  { day: 'Mittwoch', jsDay: 3, open: '08:00', close: '20:00', closed: false },
  { day: 'Donnerstag', jsDay: 4, open: '08:00', close: '20:00', closed: false },
  { day: 'Freitag', jsDay: 5, open: '08:00', close: '20:00', closed: false },
  { day: 'Samstag', jsDay: 6, open: '08:00', close: '20:00', closed: false },
  { day: 'Sonntag', jsDay: 0, open: '08:00', close: '20:00', closed: false },
];

export function getTodayHours(date = new Date()) {
  const jsDay = date.getDay();
  return OPENING_HOURS.find((entry) => entry.jsDay === jsDay) ?? null;
}
