import { formatCalendarDate } from "./formatCalendarDate";

/**
 * Spanish-locale energy in kWh: no decimals for whole amounts, at most one
 * otherwise -- "268 kWh", "3,4 kWh".
 */
export function formatKilowattHours(value: number): string {
  const formatted = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value);
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
