import { describe, expect, it } from "vitest";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementReferenceResponseStatus,
} from "../../api/models";
import { buildCoefficient } from "../../test/fixtures";
import { summarizeApplicationProgress } from "./sharingAgreementApplicationProgress";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, DERIVED, CLOSED, PENDING_SUCCESSION } = SharingAgreementPartitionCoefficientResponseEndState;
const { SUPERSEDED } = SharingAgreementReferenceResponseStatus;

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

    expect(summarizeApplicationProgress(coefficients)).toEqual({
      appliedCount: 3,
      total: 3,
      isComplete: true,
      hasPendingWithoutCurrent: false,
    });
  });

  it("reports an empty set as zero of zero", () => {
    expect(summarizeApplicationProgress([])).toMatchObject({ appliedCount: 0, total: 0 });
  });

  describe("hasPendingWithoutCurrent", () => {
    const inForce = (coefficient: number) => ({
      coefficient,
      validFrom: "2023-01-01T00:00:00Z",
      sharingAgreement: { id: "sa-previous", name: "Reparto 2023", status: SUPERSEDED },
    });

    it("is true when one pending row among several has no coefficient in force", () => {
      const coefficients = [
        buildCoefficient({ coefficientId: "c1", applicationState: PENDING, currentCoefficient: inForce(0.25) }),
        buildCoefficient({ coefficientId: "c2", applicationState: PENDING, currentCoefficient: null }),
        buildCoefficient({ coefficientId: "c3", applicationState: APPLIED, endState: OPEN, currentCoefficient: inForce(0.3) }),
        buildCoefficient({ coefficientId: "c4", applicationState: APPLIED, endState: CLOSED, currentCoefficient: null }),
      ];

      expect(summarizeApplicationProgress(coefficients).hasPendingWithoutCurrent).toBe(true);
    });

    it("is false when every pending row still has a coefficient in force, even if applied rows have none", () => {
      const coefficients = [
        buildCoefficient({ coefficientId: "c1", applicationState: PENDING, currentCoefficient: inForce(0.25) }),
        buildCoefficient({ coefficientId: "c2", applicationState: PENDING, currentCoefficient: inForce(0.1) }),
        buildCoefficient({ coefficientId: "c3", applicationState: APPLIED, endState: DERIVED, currentCoefficient: null }),
        buildCoefficient({ coefficientId: "c4", applicationState: APPLIED, endState: CLOSED, currentCoefficient: null }),
      ];

      expect(summarizeApplicationProgress(coefficients).hasPendingWithoutCurrent).toBe(false);
    });

    it("is false when nothing is pending", () => {
      const coefficients = [
        buildCoefficient({ coefficientId: "c1", applicationState: APPLIED, endState: OPEN, currentCoefficient: null }),
        buildCoefficient({ coefficientId: "c2", applicationState: APPLIED, endState: CLOSED, currentCoefficient: null }),
      ];

      expect(summarizeApplicationProgress(coefficients).hasPendingWithoutCurrent).toBe(false);
    });
  });
});
