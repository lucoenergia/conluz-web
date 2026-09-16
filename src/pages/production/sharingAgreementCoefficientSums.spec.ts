import { describe, expect, it } from "vitest";
import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import {
  COEFFICIENT_SCALE,
  computeSharingAgreementCoefficientSums,
  computeCoefficientDelta,
  formatCoefficientDelta,
  formatCoefficientPercentage,
  isFullSum,
  toIntegerUnits,
  type CoefficientSummable,
} from "./sharingAgreementCoefficientSums";

const { APPLIED, PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;

function coefficient(
  value: number,
  applicationState: SharingAgreementPartitionCoefficientResponseApplicationState = PENDING,
): CoefficientSummable {
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
    expect(computeSharingAgreementCoefficientSums([{ coefficient: undefined, applicationState: PENDING }]).fileSumUnits).toBe(0);
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

  describe("formatCoefficientPercentage", () => {
    it("always pads to 4 fixed decimals, matching formatPercentage's generic default", () => {
      expect(formatCoefficientPercentage(1)).toBe("100,0000 %");
      expect(formatCoefficientPercentage(0.7)).toBe("70,0000 %");
    });

    it("rounds a value with more natural digits to exactly 4 decimals", () => {
      // 999,999 / 1,000,000 units — the exact "one short" scenario from isFullSum.
      expect(formatCoefficientPercentage(999_999 / COEFFICIENT_SCALE)).toBe("99,9999 %");
    });

    it("formats a tiny gap (1 unit) without collapsing to 0", () => {
      expect(formatCoefficientPercentage(1 / COEFFICIENT_SCALE)).toBe("0,0001 %");
    });
  });

  describe("computeCoefficientDelta", () => {
    it("is positive when the draft raises the coefficient", () => {
      expect(computeCoefficientDelta(0.4, 0.35)).toBe(0.05);
    });

    it("is negative when the draft lowers it", () => {
      expect(computeCoefficientDelta(0.25, 0.3)).toBe(-0.05);
    });

    it("is exactly 0 for an unchanged coefficient", () => {
      expect(computeCoefficientDelta(0.3, 0.3)).toBe(0);
    });

    it("composes from integer units, so the subtraction can't drift", () => {
      // 0.4 - 0.35 is 0.050000000000000044 as raw doubles; toBe is exact
      // equality, so this fails outright if the helper ever subtracts floats.
      expect(computeCoefficientDelta(0.4, 0.35)).not.toBe(0.4 - 0.35);
      expect(computeCoefficientDelta(0.4, 0.35)).toBe(50_000 / COEFFICIENT_SCALE);
    });

    it("resolves a 1-unit difference rather than collapsing it to 0", () => {
      expect(computeCoefficientDelta(0.300001, 0.3)).toBe(1 / COEFFICIENT_SCALE);
    });

    it("is null — never 0 — when there is no coefficient in force", () => {
      expect(computeCoefficientDelta(0.4, undefined)).toBeNull();
    });

    it("is null while the draft value is unusable mid-edit", () => {
      // An empty or unparseable field resolves to undefined/NaN upstream. "No
      // comparison yet" must not render as "no change".
      expect(computeCoefficientDelta(undefined, 0.35)).toBeNull();
      expect(computeCoefficientDelta(NaN, 0.35)).toBeNull();
    });
  });

  describe("formatCoefficientDelta", () => {
    it("signs an increase and a decrease, at the same fixed 4 decimals as every other percentage", () => {
      expect(formatCoefficientDelta(0.05)).toBe("+5,0000 %");
      expect(formatCoefficientDelta(-0.025)).toBe("-2,5000 %");
    });

    it("leaves an unchanged coefficient unsigned — no change is not an increase", () => {
      expect(formatCoefficientDelta(0)).toBe("0,0000 %");
    });

    it("keeps a 1-unit difference visible", () => {
      expect(formatCoefficientDelta(1 / COEFFICIENT_SCALE)).toBe("+0,0001 %");
    });
  });
});
