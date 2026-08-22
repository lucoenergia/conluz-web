/**
 * Formats an ISO date-time string as a calendar date, trusting only the
 * YYYY-MM-DD prefix the backend put in the string rather than constructing a
 * Date from the full instant. This avoids reinterpreting a non-UTC offset
 * (e.g. Madrid midnight, "...+02:00") in UTC, which would silently roll the
 * displayed day back by one.
 */
export function formatCalendarDate(isoDateTime: string | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!isoDateTime) return "-";

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDateTime);
  if (!match) return "-";

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
    ...options,
  });
}
