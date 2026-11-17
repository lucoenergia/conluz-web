// Backend instants (validFrom, uploadedAt, createdAt, ...) are always
// Instant/UTC on the wire ("...Z" — Jackson never emits a preserved local
// offset for java.time.Instant). They're produced from a LocalDate via
// `appliedOn.atStartOfDay(zoneId).toInstant()` with `conluz.time.zone.id`
// = Europe/Madrid (see CoefficientActivationServiceImpl in the backend), so
// e.g. Madrid midnight on the 10th is genuinely "2026-09-09T22:00:00Z" on
// the wire. Trusting the raw YYYY-MM-DD prefix (the previous approach here)
// silently reads that as the 9th. Reinterpreting the instant in
// Europe/Madrid recovers the calendar day the backend actually meant.
export const APP_TIME_ZONE = "Europe/Madrid";

/**
 * Formats an ISO date-time string as a calendar date in the app's timezone
 * (Europe/Madrid), matching the zone the backend derived the instant from.
 */
export function formatCalendarDate(isoDateTime: string | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!isoDateTime) return "-";

  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
    ...options,
  });
}

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formats a local calendar date as the API writes it (`format: date`,
 * "2026-03-01") in the same long form as `formatCalendarDate`. A local date
 * names a day, not an instant, so no time zone may move it: the day is read
 * from the text and formatted in UTC, where it was built. Any other shape
 * renders "-".
 */
export function formatLocalDate(localDate: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  const match = localDate ? LOCAL_DATE.exec(localDate) : null;
  if (!match) return "-";

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "-";

  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
    timeZone: "UTC",
  });
}

/**
 * Short form — "20 abr 2024". For the detail headers, where dates sit in a
 * key-fact strip cell and in a four-column grid and the long form ("20 de abril
 * de 2024") wraps or truncates.
 */
export const SHORT_CALENDAR_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

const TIME_OF_DAY = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: APP_TIME_ZONE,
});

/**
 * Formats an ISO instant as the time of day in the app's timezone
 * (Europe/Madrid), never the device's: "00:30". For chart labels built from
 * instants; an hour that is already local is `formatHourOfDay`'s job.
 */
export function formatTimeOfDay(isoInstant: string | undefined): string {
  if (!isoInstant) return "-";

  const date = new Date(isoInstant);
  if (Number.isNaN(date.getTime())) return "-";

  return TIME_OF_DAY.format(date);
}
