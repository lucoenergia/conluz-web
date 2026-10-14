import { APP_TIME_ZONE, formatCalendarDate } from "./formatCalendarDate";

/**
 * Spanish-locale energy in kWh: no decimals for whole amounts, at most two
 * otherwise and no trailing zeros -- "268 kWh", "3,4 kWh", "12,57 kWh".
 */
export function formatKilowattHours(value: number): string {
  const formatted = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value);
  return `${formatted} kWh`;
}

/** Spanish-locale amount in euros, to the cent: "12,34 €". */
export function formatEuros(value: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}

/**
 * A price per kWh, without rounding it away: the backend returns it exactly as
 * configured, and a label stating the price used must state that price.
 * "0,15 €/kWh", "0,1234 €/kWh".
 */
export function formatEurosPerKilowattHour(value: number): string {
  const formatted = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value);
  return `${formatted} €/kWh`;
}

/** The month an instant falls in, in the app's time zone: "septiembre de 2026". */
export function formatMonth(isoDateTime: string): string {
  return formatCalendarDate(isoDateTime, { day: undefined, month: "long", year: "numeric" });
}

const ZERO_KILOWATT_HOURS = formatKilowattHours(0);

/**
 * An hourly average in kWh, which is often a fraction of a kWh, written as
 * every other kWh figure is (formatKilowattHours). A positive average too small
 * to show at that precision says so rather than printing "0 kWh", which reads
 * as a measured zero; a measured zero still reads "0 kWh". "0,42 kWh",
 * "menos de 0,01 kWh".
 */
export function formatAverageKilowattHours(value: number): string {
  const formatted = formatKilowattHours(value);
  if (value > 0 && formatted === ZERO_KILOWATT_HOURS) {
    return `menos de ${formatKilowattHours(0.01)}`;
  }
  return formatted;
}

/**
 * The month of a local calendar date as the API writes it ("2026/08/01"), read
 * from the date itself rather than as an instant: it names a day in the
 * community's calendar, so no time zone may move it to the day before (#219).
 *
 * Only that shape is read, on purpose. Any other ("2026-08-01") renders
 * "Invalid Date", so a fixture that drifts from what the server sends fails
 * loudly in its specs instead of passing; a parser lenient enough to accept it
 * is how this label once shipped broken while every test was green.
 */
function calendarMonthOf(localDate: string, options: Intl.DateTimeFormatOptions): string {
  const [year, month] = localDate.split("/").map(Number);
  // Mid-month noon, named in the app's time zone: no offset can reach another month.
  return new Date(Date.UTC(year, month - 1, 15, 12)).toLocaleDateString("es-ES", { timeZone: APP_TIME_ZONE, ...options });
}

/** A chart's month label, from a local calendar date: "2026/08/01" reads "ago". */
export function formatShortMonth(localDate: string): string {
  return calendarMonthOf(localDate, { month: "short" });
}

/** The full name of a local calendar date's month: "2026/08/01" reads "agosto de 2026". */
export function formatCalendarMonth(localDate: string): string {
  return calendarMonthOf(localDate, { month: "long", year: "numeric" });
}

/**
 * An hour of the local day, given as a number from 0 to 23 that is already
 * local: no time zone is involved. "8 h". For an ISO instant, use
 * `formatTimeOfDay`, which reads it in `APP_TIME_ZONE`.
 */
export function formatHourOfDay(hour: number): string {
  return `${hour} h`;
}
