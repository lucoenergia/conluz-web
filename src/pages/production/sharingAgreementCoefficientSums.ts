import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { formatPercentage } from "../../utils/formatPercentage";

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

export interface CoefficientSummable {
  coefficient: number | undefined;
  applicationState?: SharingAgreementPartitionCoefficientResponse["applicationState"];
}

/** Pure reducer — integer-unit sums, never compares raw floats. */
export function computeSharingAgreementCoefficientSums(
  coefficients: CoefficientSummable[],
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

/**
 * Formats a 0-1 coefficient (or a coefficient-derived ratio: a sum, a gap)
 * as a percentage, at 4 decimals — the coefficient's own 6-decimal precision
 * (COEFFICIENT_SCALE) shifted 2 places by the *100 percent conversion, so
 * 4dp on the percentage losslessly matches 6dp on the underlying fraction.
 * Do not raise this back to 6dp: the extra 2 digits are always trailing
 * zeros. The editor's "%"-mode input (formatCoefficientForInput) renders the
 * same quantity at the same 4dp scale, by the same reasoning — it is not, as
 * this comment once claimed, a raw 0-1 coefficient at 6dp.
 */
export function formatCoefficientPercentage(value: number): string {
  return formatPercentage(value);
}

/**
 * Signed difference between the coefficient a draft proposes and the one
 * currently in force, on the same 0-1 scale as its inputs.
 *
 * Composed from the integer 1e-6 units for the same reason the sums are:
 * `0.4 - 0.35` is 0.050000000000000044 as raw doubles, and a difference that
 * formats correctly by luck rather than by construction is the kind that
 * starts lying once the inputs change.
 *
 * Returns `null` — never `0` — when there is nothing to compare: no
 * coefficient in force, or a draft value that is `undefined`/non-finite
 * because the admin is mid-edit on an empty or unparseable field. "No
 * comparison" and "no change" are different statements and must not collapse
 * into the same rendering.
 *
 * Both arguments are canonical 0-1 fractions regardless of the unit the
 * editor is currently displaying: `parseCoefficientInput` converts kW to the
 * fraction before it is ever stored on the row, so kW mode needs no
 * conversion here and must not add one.
 */
export function computeCoefficientDelta(
  draftValue: number | undefined,
  currentValue: number | undefined,
): number | null {
  if (draftValue === undefined || !Number.isFinite(draftValue)) return null;
  if (currentValue === undefined || !Number.isFinite(currentValue)) return null;
  return (toIntegerUnits(draftValue) - toIntegerUnits(currentValue)) / COEFFICIENT_SCALE;
}

/**
 * A difference as a signed percentage, at the same fixed 4 decimals as every
 * other percentage on this page. `exceptZero` so an unchanged coefficient
 * reads "0,0000 %" rather than "+0,0000 %" — no change is not an increase.
 */
export function formatCoefficientDelta(delta: number): string {
  return formatPercentage(delta, { signDisplay: "exceptZero" });
}
