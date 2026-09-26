import { describe, expect, it } from "vitest";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import { buildCoefficient } from "../../test/fixtures";
import { summarizeApplicationProgress } from "./sharingAgreementApplicationProgress";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, DERIVED, CLOSED, PENDING_SUCCESSION } = SharingAgreementPartitionCoefficientResponseEndState;

describe("summarizeApplicationProgress", () => {
  it("counts every APPLIED row, whatever its endState, against the total", () => {
    const coefficients = [
      buildCoefficient({ coefficientId: "c1", applicationState: APPLIED, endState: OPEN }),
      buildCoefficient({ coefficientId: "c2", applicationState: APPLIED, endState: DERIVED }),
      buildCoefficient({ coefficientId: "c3", applicationState: APPLIED, endState: CLOSED }),
      buildCoefficient({ coefficientId: "c4", applicationState: PENDING, endState: OPEN }),
      buildCoefficient({ coefficientId: "c5", applicationState: PENDING, endState: PENDING_SUCCESSION }),
    ];

    expect(summarizeApplicationProgress(coefficients)).toMatchObject({ appliedCount: 3, total: 5, isComplete: false });
  });

  it("counts none applied when every row is pending", () => {
    const coefficients = [
      buildCoefficient({ coefficientId: "c1", applicationState: PENDING }),
      buildCoefficient({ coefficientId: "c2", applicationState: PENDING }),
    ];

    expect(summarizeApplicationProgress(coefficients)).toMatchObject({ appliedCount: 0, total: 2, isComplete: false });
  });

  it("is complete when every row is APPLIED, closed and derived rows included", () => {
    const coefficients = [
      buildCoefficient({ coefficientId: "c1", applicationState: APPLIED, endState: OPEN }),
      buildCoefficient({ coefficientId: "c2", applicationState: APPLIED, endState: CLOSED }),
      buildCoefficient({ coefficientId: "c3", applicationState: APPLIED, endState: DERIVED }),
    ];

    expect(summarizeApplicationProgress(coefficients)).toEqual({ appliedCount: 3, total: 3, isComplete: true });
  });

  it("reports an empty set as zero of zero", () => {
    expect(summarizeApplicationProgress([])).toMatchObject({ appliedCount: 0, total: 0 });
  });
});
