import { describe, expect, it } from "vitest";
import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { COEFFICIENT_SCALE, computeSharingAgreementCoefficientSums, isFullSum, toIntegerUnits } from "./sharingAgreementCoefficientSums";

const { APPLIED, PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;

function coefficient(
  value: number,
  applicationState: SharingAgreementPartitionCoefficientResponseApplicationState = PENDING,
): SharingAgreementPartitionCoefficientResponse {
  return { coefficient: value, applicationState };
}

describe("sharingAgreementCoefficientSums", () => {
  it("sums a genuinely float-drifting set exactly in integer units", () => {
    // Eight 0.111111 plus one 0.111112: raw-float sum is 0.9999999999999999
    // (verified — !== 1), while the integer-unit sum is exactly 1_000_000.
    const drifting = [0.111111, 0.111111, 0.111111, 0.111111, 0.111111, 0.111111, 0.111111, 0.111111, 0.111112];
    const rawFloatSum = drifting.reduce((sum, value) => sum + value, 0);
    expect(rawFloatSum).not.toBe(1);

    const coefficients = drifting.map((value) => coefficient(value));
    expect(computeSharingAgreementCoefficientSums(coefficients).fileSumUnits).toBe(COEFFICIENT_SCALE);
  });

  it("returns 0 for an empty set", () => {
    expect(computeSharingAgreementCoefficientSums([])).toEqual({ fileSumUnits: 0, appliedSumUnits: 0 });
  });

  it("only sums APPLIED coefficients into appliedSumUnits, while fileSumUnits includes everything", () => {
    const coefficients = [coefficient(0.3, PENDING), coefficient(0.4, PENDING), coefficient(0.3, PENDING)];
    const sums = computeSharingAgreementCoefficientSums(coefficients);
    expect(sums.fileSumUnits).toBe(1_000_000);
    expect(sums.appliedSumUnits).toBe(0);
  });

  it("mixes PENDING and APPLIED coefficients correctly", () => {
    const coefficients = [coefficient(0.25, APPLIED), coefficient(0.25, PENDING), coefficient(0.5, APPLIED)];
    const sums = computeSharingAgreementCoefficientSums(coefficients);
    expect(sums.fileSumUnits).toBe(1_000_000);
    expect(sums.appliedSumUnits).toBe(750_000);
  });

  it("treats a missing coefficient value as 0", () => {
    expect(toIntegerUnits(undefined)).toBe(0);
    expect(computeSharingAgreementCoefficientSums([{ applicationState: PENDING }]).fileSumUnits).toBe(0);
  });

  it("never hides or skips a zero coefficient — it still contributes 0 units, not omitted", () => {
    const coefficients = [coefficient(0, APPLIED), coefficient(1, APPLIED)];
    expect(computeSharingAgreementCoefficientSums(coefficients).appliedSumUnits).toBe(1_000_000);
  });

  describe("isFullSum", () => {
    it("is false one unit short of the scale", () => {
      expect(isFullSum(999_999)).toBe(false);
    });

    it("is true exactly at the scale", () => {
      expect(isFullSum(1_000_000)).toBe(true);
    });
  });
});
