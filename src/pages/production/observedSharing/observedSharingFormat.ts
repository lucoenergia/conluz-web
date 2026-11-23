import {
  CoefficientObservationResponseStatus,
  type LeavingObservationResponseStatus,
  type ObservedDateResponse,
  type SharingAgreementObservationSummaryResponse,
  type SharingAnomalyResponse,
  type UnallocatedShareResponse,
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
 * A row's measurable days, "N de M": N its observedValidDays, M the
 * plant-valid days of its own window, both the backend's (UI-AGR-042). Each
 * row's window starts on its own observed date, so no other count is its M.
 * Null for a row of the plant's own supply, which cannot be observed.
 */
export function formatMeasurableDays(row: {
  status: CoefficientObservationResponseStatus | LeavingObservationResponseStatus;
  observedValidDays: number;
  windowDays: number;
}): string | null {
  return row.status === CoefficientObservationResponseStatus.NOT_OBSERVABLE
    ? null
    : `${row.observedValidDays} de ${row.windowDays}`;
}

/**
 * The days a figure is counted over, "del DD/MM/AAAA al DD/MM/AAAA", both
 * the backend's (UI-AGR-040, UI-AGR-042). Null when it gives none: a row
 * with no window (windowDays 0) has neither date.
 */
export function formatWindow(from: string, to: string): string;
export function formatWindow(from: string | null, to: string | null): string | null;
export function formatWindow(from: string | null, to: string | null): string | null {
  return from === null || to === null ? null : `del ${formatDay(from)} al ${formatDay(to)}`;
}

/**
 * The evidence behind an anomaly (UI-AGR-024): "β esperada 3,1500 % ·
 * β observada 4,1200 % · 21 días medibles". The expected β is the backend's,
 * never derived here (UI-AGR-031); an anomaly attributed to no agreement has
 * none, and leaves it out.
 */
export function formatAnomalyDetail(
  anomaly: Pick<SharingAnomalyResponse, "expectedBeta" | "observedBeta" | "observedValidDays">,
): string {
  const days = anomaly.observedValidDays;
  return [
    anomaly.expectedBeta !== null && `β esperada ${formatBeta(anomaly.expectedBeta)}`,
    `β observada ${formatBeta(anomaly.observedBeta)}`,
    `${days} ${days === 1 ? "día medible" : "días medibles"}`,
  ]
    .filter(Boolean)
    .join(" · ");
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
