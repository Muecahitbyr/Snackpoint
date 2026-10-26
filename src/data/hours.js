// Weekly opening hours, Monday-first for display. Maintained in the admin
// panel and filled in from the database when the page loads.
// `jsDay` is the value `new Date().getDay()` returns for that day (0 = Sunday).
export const OPENING_HOURS = [];

export function setOpeningHours(hours) {
  OPENING_HOURS.splice(0, OPENING_HOURS.length, ...hours);
}

export function getTodayHours(date = new Date()) {
  const jsDay = date.getDay();
  return OPENING_HOURS.find((entry) => entry.jsDay === jsDay) ?? null;
}
