import type {
  CoefficientObservationResponse,
  ObservedDateResponse,
  SharingAgreementObservationSummaryResponse,
  UnallocatedShareResponse,
} from "../../../api/models";
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
 * Whether an unattributed production share (1 − Σβ) is impossible: below −0.1
 * percentage points, the tolerance of the analysis, the supplies received more
 * energy than the plant produced, which only wrong Datadis data explains.
 * Between that and 0 it is rounding (UI-AGR-039). Compared in millionths, as
 * `betaMatches` is. A share the analysis did not give is not impossible.
 */
export function isImpossibleUnattributedShare(unallocated: number | null | undefined): unallocated is number {
  return (
    unallocated !== null && unallocated !== undefined && Math.round(unallocated * COEFFICIENT_SCALE) < -EQUAL_TOLERANCE
  );
}

/** What the rest of an unattributed share says: beyond ±0.1 points, which way it goes; within, rounding. */
export type UnattributedRemainderKind = "receivedMore" | "notDelivered" | "rounding";

const SIGNED_POINTS = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

/**
 * The unattributed share left once the registered share of the supplies
 * without data those days is taken out (UI-AGR-041): the subtraction of two
 * values the analysis returned, in percentage points with its sign. Computed
 * in millionths, so no float error moves it across the ±0.1 points edge.
 */
export function unattributedRemainder(share: UnallocatedShareResponse): {
  text: string;
  kind: UnattributedRemainderKind;
} {
  const unallocated = Math.round(share.unallocated * COEFFICIENT_SCALE);
  const millionths = unallocated - Math.round(share.registeredShareWithoutData * COEFFICIENT_SCALE);
  const kind: UnattributedRemainderKind =
    millionths < -EQUAL_TOLERANCE ? "receivedMore" : millionths > EQUAL_TOLERANCE ? "notDelivered" : "rounding";
  // A percentage point is 10 000 millionths of the 0-1 scale.
  return { text: `${SIGNED_POINTS.format(millionths / 10_000)} pp`, kind };
}

/**
 * Whether a row's measurable days rest on its agreement's whole applied window
 * (UI-AGR-042). The window starts on the agreement's most frequent observed
 * date, and a row's days run from the last day of its own observed date to the
 * window's end. A row with no observed date rests on the whole window. One
 * observed on the window's first day does too, but that day is known only when
 * the most frequent date is a single day: for a range or an open date the
 * contract does not say which of its days the window starts on. A row observed
 * earlier counts days from before the window, and one observed later, fewer.
 */
function restsOnWholeWindow(observed: ObservedDateResponse | null, windowStart: ObservedDateResponse | null): boolean {
  if (observed === null) return true;
  return windowStart !== null && windowStart.from === windowStart.to && observed.to === windowStart.to;
}

/**
 * A row's measurable days: "N de D" when they rest on the agreement's whole
 * applied window, D being the plant's measurable days in it; only N otherwise,
 * and when the analysis gave no window (UI-AGR-042).
 */
export function formatMeasurableDays(
  row: CoefficientObservationResponse,
  summary: SharingAgreementObservationSummaryResponse,
): string {
  const windowDays = summary.unallocatedShare?.days;
  return windowDays !== undefined && restsOnWholeWindow(row.observedDate, summary.mostFrequentObservedDate)
    ? `${row.observedValidDays} de ${windowDays}`
    : String(row.observedValidDays);
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
 * A share of the production, such as the unattributed one or the registered
 * share of the supplies without data, with as many decimals as the design gives it;
 * "—" when the analysis gave none.
 */
export const formatPercentageOrNone = (value: number | null | undefined, decimals: number) =>
  value === null || value === undefined
    ? NO_VALUE
    : formatPercentage(value, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
