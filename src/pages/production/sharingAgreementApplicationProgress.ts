import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

export interface ApplicationProgress {
  /** Rows with an application date, whatever their endState — a closed row was applied too. */
  appliedCount: number;
  total: number;
  /** Every row has an application date — there is no progress left to report. */
  isComplete: boolean;
}

/**
 * How far this agreement's own coefficients have been applied. It says nothing
 * about the plant's effective distribution: a pending supply keeps its
 * previous coefficient until this one is activated.
 */
export function summarizeApplicationProgress(
  coefficients: readonly Pick<SharingAgreementPartitionCoefficientResponse, "applicationState">[],
): ApplicationProgress {
  const appliedCount = coefficients.filter(
    (coefficient) =>
      coefficient.applicationState === SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED,
  ).length;
  const total = coefficients.length;
  return { appliedCount, total, isComplete: appliedCount === total };
}
