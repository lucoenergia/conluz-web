import type { ObservedDateResponse, SharingAgreementObservationSummaryResponse } from "../../../api/models";
import { formatLocalDate, SHORT_CALENDAR_DATE } from "../../../utils/formatCalendarDate";
import { formatPercentage } from "../../../utils/formatPercentage";
import { COEFFICIENT_SCALE } from "../sharingAgreementCoefficientSums";

/** What a value the analysis did not give reads as. */
export const NO_VALUE = "—";

const NUMERIC_DATE: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };

/** A local day as "dd/mm/aaaa". */
export const formatDay = (localDate: string) => formatLocalDate(localDate, NUMERIC_DATE);

/** The analysed data, in words, inside a sentence: "del 1 abr 2023 al 31 oct 2026". */
export const formatDataRangeInSentence = (from: string, to: string) =>
  `del ${formatLocalDate(from, SHORT_CALENDAR_DATE)} al ${formatLocalDate(to, SHORT_CALENDAR_DATE)}`;

/** The analysed data, in words, on its own: "Del 1 abr 2023 al 31 oct 2026". */
export const formatDataRange = (from: string, to: string) => `D${formatDataRangeInSentence(from, to).slice(1)}`;

/**
 * An observed day as precisely as the data allows: one day when it is known,
 * "Entre el … y el …" when it falls somewhere in a range, and "… o antes" when
 * the data starts on it, so it may have started earlier.
 */
export function formatObservedDate(date: ObservedDateResponse): string {
  if (date.from === null) return `${formatDay(date.to)} o antes`;
  if (date.from === date.to) return formatDay(date.to);
  return `Entre el ${formatDay(date.from)} y el ${formatDay(date.to)}`;
}

/** A registered period, its end exclusive (UI-AGR-019): the first day it no longer applies. */
export function formatRegisteredPeriod(from: string | null, to: string | null): string {
  if (from === null) return "Sin fecha";
  return `${formatDay(from)} – ${to ? formatDay(to) : "en curso"}`;
}

/** A β, on a 0-1 scale, in % with 4 decimals; "—" when the analysis gave none. */
export const formatBeta = (value: number | null) => (value === null ? NO_VALUE : formatPercentage(value));

/** ±0.1 percentage points, in millionths of the 0-1 scale. */
const EQUAL_TOLERANCE = COEFFICIENT_SCALE / 1000;

/**
 * Whether an observed β counts as the registered one: within ±0.1 percentage
 * points it does, the tolerance of the analysis. Compared in millionths, the
 * precision coefficients are stored with, so no float rounding moves the edge.
 */
export function betaMatches(observed: number, registered: number): boolean {
  return Math.abs(Math.round(observed * COEFFICIENT_SCALE) - Math.round(registered * COEFFICIENT_SCALE)) <= EQUAL_TOLERANCE;
}

/**
 * Whether an unexplained share (1 − Σβ) is impossible: below −0.1 percentage
 * points, the tolerance of the analysis, the supplies received more energy
 * than the plant produced, which only wrong Datadis data explains. Between
 * that and 0 it is rounding (UI-AGR-039). Compared in millionths, as
 * `betaMatches` is. A share the analysis did not give is not impossible.
 */
export function isImpossibleUnexplainedShare(unallocated: number | null | undefined): unallocated is number {
  return (
    unallocated !== null && unallocated !== undefined && Math.round(unallocated * COEFFICIENT_SCALE) < -EQUAL_TOLERANCE
  );
}

/**
 * The evidence behind an anomaly: "β observada 4,1200 % en 21 días medibles."
 * No expected β beside it: the analysis does not return one, and deriving it
 * here would restate the backend's attribution (UI-AGR-031).
 */
export function formatAnomalyDetail(observedBeta: number, validDays: number): string {
  return `β observada ${formatBeta(observedBeta)} en ${validDays} ${validDays === 1 ? "día medible" : "días medibles"}.`;
}

/** An anomaly's end: its last day, or "en curso" while it lasts until the end of the data. */
export const formatAnomalyEnd = (end: string | null) => (end === null ? "en curso" : formatDay(end));

/**
 * When the distributor applied an agreement, as the analysis observed it: the
 * day most of its coefficients started on, or why there is none.
 */
export function formatAgreementApplication(summary: SharingAgreementObservationSummaryResponse): string {
  const observed = summary.mostFrequentObservedDate;
  if (observed) {
    if (observed.from === null) return `Aplicado el ${formatDay(observed.to)} o antes`;
    if (observed.from === observed.to) return `Aplicado desde ${formatDay(observed.to)}`;
    return `Entre el ${formatDay(observed.from)} y el ${formatDay(observed.to)}`;
  }
  if (summary.distributorFileSentOn) return `Pendiente de aplicar · enviado el ${formatDay(summary.distributorFileSentOn)}`;
  return "Sin observar";
}

/** "A", "A y B", "A, B y C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

/**
 * A share of the production that is not a coefficient (1 − Σβ, the part of
 * the supplies without data), with as many decimals as the design gives it;
 * "—" when the analysis gave none.
 */
export const formatPercentageOrNone = (value: number | null | undefined, decimals: number) =>
  value === null || value === undefined
    ? NO_VALUE
    : formatPercentage(value, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
