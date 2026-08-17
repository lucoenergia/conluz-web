import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

// 1e-6 units — coefficients are stored on a 0-1 scale and rounded to six
// decimals before summing, so that summing IEEE-754 doubles (which can drift,
// e.g. eight 0.111111s plus one 0.111112 sum to 0.9999999999999999 as raw
// floats) never produces a false negative against a legitimate 100% set.
export const COEFFICIENT_SCALE = 1_000_000;

/** Rounds a 0-1 coefficient to 6 decimals, expressed as an integer count of 1e-6 units. */
export function toIntegerUnits(coefficient: number | undefined): number {
  return Math.round((coefficient ?? 0) * COEFFICIENT_SCALE);
}

export interface SharingAgreementCoefficientSums {
  fileSumUnits: number;
  appliedSumUnits: number;
}

/** Pure reducer — integer-unit sums, never compares raw floats. */
export function computeSharingAgreementCoefficientSums(
  coefficients: SharingAgreementPartitionCoefficientResponse[],
): SharingAgreementCoefficientSums {
  let fileSumUnits = 0;
  let appliedSumUnits = 0;

  for (const coefficient of coefficients) {
    const units = toIntegerUnits(coefficient.coefficient);
    fileSumUnits += units;
    if (coefficient.applicationState === SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED) {
      appliedSumUnits += units;
    }
  }

  return { fileSumUnits, appliedSumUnits };
}

/**
 * Exact-integer equality against a full 100% set. A later issue gates an
 * action button on this same computation, which is why it's exported here
 * rather than inlined into a component.
 */
export function isFullSum(sumUnits: number): boolean {
  return sumUnits === COEFFICIENT_SCALE;
}
