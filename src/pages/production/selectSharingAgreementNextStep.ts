import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse, SharingAgreementResponse } from "../../api/models";
import { COEFFICIENT_SCALE, computeSharingAgreementCoefficientSums, isFullSum } from "./sharingAgreementCoefficientSums";
import { summarizeApplicationProgress } from "./sharingAgreementApplicationProgress";

export type SharingAgreementNextStep =
  | { kind: "AUTHOR_COEFFICIENTS"; blockedReason: "NO_COEFFICIENTS" }
  | { kind: "AUTHOR_COEFFICIENTS"; blockedReason: "SUM_MISMATCH"; deltaMillionths: number }
  | { kind: "GENERATE_AND_SEND"; canGenerate: true }
  | { kind: "GENERATE_AND_SEND"; canGenerate: false; blockedReason: "NO_REGULATORY_CODE" }
  | {
      kind: "RECORD_APPLICATION_DATES";
      pendingCount: number;
      totalCount: number;
      /** Some pending point has no coefficient in force in the plant, so it receives no production yet. */
      hasPendingWithoutCurrent: boolean;
    }
  | { kind: "ALL_DONE"; totalCount: number }
  | { kind: "NONE" };

/**
 * `coefficients` is the raw, non-defaulted query result: `undefined` while the
 * partition-coefficients request is still in flight, as opposed to a resolved
 * `[]`. Conflating the two would render "no coefficients" for a fraction of a
 * second on every load of a DRAFT that actually has them.
 */
export function selectSharingAgreementNextStep(
  agreement: SharingAgreementResponse | undefined,
  coefficients: SharingAgreementPartitionCoefficientResponse[] | undefined,
  plantRegulatoryCode: string | undefined,
): SharingAgreementNextStep {
  if (coefficients === undefined) return { kind: "NONE" };
  if (!agreement || agreement.status === SharingAgreementResponseStatus.SUPERSEDED) return { kind: "NONE" };

  if (agreement.status === SharingAgreementResponseStatus.DRAFT) {
    if (coefficients.length === 0) {
      return { kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" };
    }

    const { fileSumUnits } = computeSharingAgreementCoefficientSums(coefficients);
    if (!isFullSum(fileSumUnits)) {
      return {
        kind: "AUTHOR_COEFFICIENTS",
        blockedReason: "SUM_MISMATCH",
        deltaMillionths: COEFFICIENT_SCALE - fileSumUnits,
      };
    }

    if (!plantRegulatoryCode?.trim()) {
      return { kind: "GENERATE_AND_SEND", canGenerate: false, blockedReason: "NO_REGULATORY_CODE" };
    }

    return { kind: "GENERATE_AND_SEND", canGenerate: true };
  }

  // PUBLISHED
  const pendingCount = coefficients.filter(
    (coefficient) => coefficient.applicationState === SharingAgreementPartitionCoefficientResponseApplicationState.PENDING,
  ).length;

  // `totalCount` rides along so the surfaces that report progress ("3 de 12
  // puntos con fecha") read it from the same pass that decided the step,
  // rather than re-deriving a second count that could disagree.
  const totalCount = coefficients.length;

  const { hasPendingWithoutCurrent } = summarizeApplicationProgress(coefficients);

  return pendingCount > 0
    ? { kind: "RECORD_APPLICATION_DATES", pendingCount, totalCount, hasPendingWithoutCurrent }
    : { kind: "ALL_DONE", totalCount };
}
