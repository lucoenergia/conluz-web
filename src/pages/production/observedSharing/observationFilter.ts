import {
  CoefficientObservationResponseStatus,
  LeavingObservationResponseStatus,
  type CoefficientObservationResponse,
  type LeavingObservationResponse,
  type SharingAgreementObservationResponse,
} from "../../../api/models";

/** "Todos", "Con avisos", or one coefficient status (UI-AGR-045). */
export type ObservationFilter = "all" | "warnings" | CoefficientObservationResponseStatus;

/** Whether the filter is one coefficient status, rather than "Todos" or "Con avisos". */
export const isStatusFilter = (filter: ObservationFilter): filter is CoefficientObservationResponseStatus =>
  filter !== "all" && filter !== "warnings";

export interface FilteredRows {
  coefficients: CoefficientObservationResponse[];
  leavingRows: LeavingObservationResponse[];
  /** Every row shown, both kinds: what the filter's chip counts. */
  count: number;
}

/** Statuses of a coefficient row that warrant a look on their own. */
const COEFFICIENT_WARNINGS: ReadonlySet<CoefficientObservationResponseStatus> = new Set([
  CoefficientObservationResponseStatus.APPLIED_DIFFERENT_DATE,
  CoefficientObservationResponseStatus.NOT_DISTINGUISHABLE,
]);

/**
 * The rows "Con avisos" keeps (UI-AGR-023): coefficient rows applied on
 * another date, not distinguishable, or of a supply with an anomaly of this
 * agreement, and leaving rows that left on another date. "Todos" keeps every
 * row. A status keeps the coefficient rows in it and every leaving row: it
 * filters "Por punto de suministro" alone (UI-AGR-045). All keep the order
 * the analysis returned them in.
 */
export function filterObservationRows(observation: SharingAgreementObservationResponse, filter: ObservationFilter): FilteredRows {
  const { coefficients, leavingRows } = observation;
  if (filter === "all") return { coefficients, leavingRows, count: coefficients.length + leavingRows.length };
  if (isStatusFilter(filter)) {
    const kept = coefficients.filter((row) => row.status === filter);
    return { coefficients: kept, leavingRows, count: kept.length + leavingRows.length };
  }

  const withAnomalies = new Set(observation.summary.anomalies.map((anomaly) => anomaly.supply.id));
  const keptCoefficients = coefficients.filter(
    (row) => COEFFICIENT_WARNINGS.has(row.status) || withAnomalies.has(row.supply.id),
  );
  const keptLeaving = leavingRows.filter((row) => row.status === LeavingObservationResponseStatus.APPLIED_DIFFERENT_DATE);
  return { coefficients: keptCoefficients, leavingRows: keptLeaving, count: keptCoefficients.length + keptLeaving.length };
}
