// Backend instants (validFrom, uploadedAt, createdAt, ...) are always
// Instant/UTC on the wire ("...Z" — Jackson never emits a preserved local
// offset for java.time.Instant). They're produced from a LocalDate via
// `appliedOn.atStartOfDay(zoneId).toInstant()` with `conluz.time.zone.id`
// = Europe/Madrid (see CoefficientActivationServiceImpl in the backend), so
// e.g. Madrid midnight on the 10th is genuinely "2026-09-09T22:00:00Z" on
// the wire. Trusting the raw YYYY-MM-DD prefix (the previous approach here)
// silently reads that as the 9th. Reinterpreting the instant in
// Europe/Madrid recovers the calendar day the backend actually meant.
const APP_TIME_ZONE = "Europe/Madrid";

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
