import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;

export interface ApplicationProgress {
  /** Rows with an application date, whatever their endState — a closed row was applied too. */
  appliedCount: number;
  total: number;
  /** Every row has an application date — there is no progress left to report. */
  isComplete: boolean;
  /**
   * Some pending row has no coefficient in force in this plant — typically a
   * supply joining the plant with this agreement. Only those receive no
   * production until their date is recorded; every other pending supply stays
   * on its previous coefficient.
   */
  hasPendingWithoutCurrent: boolean;
}

/**
 * How far this agreement's own coefficients have been applied. It says nothing
 * about the plant's effective distribution: a pending supply keeps its
 * previous coefficient until this one is activated.
 */
export function summarizeApplicationProgress(
  coefficients: readonly Pick<SharingAgreementPartitionCoefficientResponse, "applicationState" | "currentCoefficient">[],
): ApplicationProgress {
  const appliedCount = coefficients.filter((coefficient) => coefficient.applicationState === APPLIED).length;
  const total = coefficients.length;
  const hasPendingWithoutCurrent = coefficients.some(
    (coefficient) => coefficient.applicationState === PENDING && coefficient.currentCoefficient === null,
  );
  return { appliedCount, total, isComplete: appliedCount === total, hasPendingWithoutCurrent };
}
