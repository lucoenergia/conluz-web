import { CoefficientObservationResponseStatus, LeavingObservationResponseStatus } from "../../../api/models";
import type { AgreementObservation, ObservedCoefficientRow, ObservedLeavingRow } from "./pendingObservationFields";

export type ObservationFilter = "all" | "warnings";

export interface FilteredRows {
  coefficients: ObservedCoefficientRow[];
  leavingRows: ObservedLeavingRow[];
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
 * row. Both keep the order the analysis returned them in.
 */
export function filterObservationRows(observation: AgreementObservation, filter: ObservationFilter): FilteredRows {
  const { coefficients, leavingRows } = observation;
  if (filter === "all") return { coefficients, leavingRows, count: coefficients.length + leavingRows.length };

  const withAnomalies = new Set(observation.summary.anomalies.map((anomaly) => anomaly.supply.id));
  const keptCoefficients = coefficients.filter(
    (row) => COEFFICIENT_WARNINGS.has(row.status) || withAnomalies.has(row.supply.id),
  );
  const keptLeaving = leavingRows.filter((row) => row.status === LeavingObservationResponseStatus.APPLIED_DIFFERENT_DATE);
  return { coefficients: keptCoefficients, leavingRows: keptLeaving, count: keptCoefficients.length + keptLeaving.length };
}
