import { describe, expect, it } from "vitest";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse, SharingAgreementResponse } from "../../api/models";
import { COEFFICIENT_SCALE } from "./sharingAgreementCoefficientSums";
import { selectSharingAgreementNextStep } from "./selectSharingAgreementNextStep";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;

const OPEN_UNCLOSED = { validFrom: null, validTo: null, endState: OPEN, endDate: null };

function agreement(status: SharingAgreementResponseStatus): SharingAgreementResponse {
  return {
    id: "agreement-1",
    plantId: "plant-1",
    name: "Reparto de prueba",
    notes: null,
    status,
    installedPowerKw: 45,
    createdAt: "2024-09-01T09:30:00Z",
    createdBy: "user-1",
    file: null,
  } as unknown as SharingAgreementResponse;
}

// A realistic multi-supply DRAFT set summing to exactly 100%.
const FULL_SUM_COEFFICIENTS: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.4, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.35, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "3", supply: { id: "s3", name: "Local C", code: "ES0031300000000003EF" }, coefficient: 0.25, applicationState: PENDING, ...OPEN_UNCLOSED },
];

const MISSING_SUM_COEFFICIENTS: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.4, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.3, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "3", supply: { id: "s3", name: "Local C", code: "ES0031300000000003EF" }, coefficient: 0.2, applicationState: PENDING, ...OPEN_UNCLOSED },
];

const EXCESS_SUM_COEFFICIENTS: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.5, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.35, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "3", supply: { id: "s3", name: "Local C", code: "ES0031300000000003EF" }, coefficient: 0.25, applicationState: PENDING, ...OPEN_UNCLOSED },
];

// A realistic multi-supply PUBLISHED set: some rows applied and closed out
// (endState CLOSED), one still pending an application date.
const PUBLISHED_WITH_PENDING_COEFFICIENTS: SharingAgreementPartitionCoefficientResponse[] = [
  {
    coefficientId: "1",
    supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" },
    coefficient: 0.5,
    applicationState: APPLIED,
    validFrom: "2024-06-20T00:00:00Z",
    validTo: null,
    endState: OPEN,
    endDate: null,
  },
  {
    coefficientId: "2",
    supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" },
    coefficient: 0.3,
    applicationState: APPLIED,
    validFrom: "2023-01-01T00:00:00Z",
    validTo: "2024-01-01T00:00:00Z",
    endState: CLOSED,
    endDate: "2024-01-01T00:00:00Z",
  },
  { coefficientId: "3", supply: { id: "s3", name: "Local C", code: "ES0031300000000003EF" }, coefficient: 0.2, applicationState: PENDING, ...OPEN_UNCLOSED },
];

const PUBLISHED_ALL_APPLIED_COEFFICIENTS: SharingAgreementPartitionCoefficientResponse[] = [
  {
    coefficientId: "1",
    supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" },
    coefficient: 0.6,
    applicationState: APPLIED,
    validFrom: "2024-06-20T00:00:00Z",
    validTo: null,
    endState: OPEN,
    endDate: null,
  },
  {
    coefficientId: "2",
    supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" },
    coefficient: 0.4,
    applicationState: APPLIED,
    validFrom: "2024-06-20T00:00:00Z",
    validTo: null,
    endState: OPEN,
    endDate: null,
  },
];

describe("selectSharingAgreementNextStep", () => {
  it("returns NONE while the coefficients query is still in flight (undefined), even on a DRAFT", () => {
    expect(selectSharingAgreementNextStep(agreement(SharingAgreementResponseStatus.DRAFT), undefined, "CAU123")).toEqual({
      kind: "NONE",
    });
  });

  it("returns NONE when there is no agreement yet", () => {
    expect(selectSharingAgreementNextStep(undefined, FULL_SUM_COEFFICIENTS, "CAU123")).toEqual({ kind: "NONE" });
  });

  it("returns NONE for a SUPERSEDED agreement regardless of coefficients", () => {
    expect(
      selectSharingAgreementNextStep(agreement(SharingAgreementResponseStatus.SUPERSEDED), FULL_SUM_COEFFICIENTS, "CAU123"),
    ).toEqual({ kind: "NONE" });
  });

  it("returns AUTHOR_COEFFICIENTS/NO_COEFFICIENTS for a DRAFT with a resolved, genuinely empty set", () => {
    expect(selectSharingAgreementNextStep(agreement(SharingAgreementResponseStatus.DRAFT), [], "CAU123")).toEqual({
      kind: "AUTHOR_COEFFICIENTS",
      blockedReason: "NO_COEFFICIENTS",
    });
  });

  it("returns AUTHOR_COEFFICIENTS/SUM_MISMATCH with a positive delta when the sum falls short", () => {
    const result = selectSharingAgreementNextStep(
      agreement(SharingAgreementResponseStatus.DRAFT),
      MISSING_SUM_COEFFICIENTS,
      "CAU123",
    );
    expect(result).toEqual({
      kind: "AUTHOR_COEFFICIENTS",
      blockedReason: "SUM_MISMATCH",
      deltaMillionths: COEFFICIENT_SCALE - 900_000,
    });
    expect((result as { deltaMillionths: number }).deltaMillionths).toBeGreaterThan(0);
  });

  it("returns AUTHOR_COEFFICIENTS/SUM_MISMATCH with a negative delta when the sum overshoots", () => {
    const result = selectSharingAgreementNextStep(
      agreement(SharingAgreementResponseStatus.DRAFT),
      EXCESS_SUM_COEFFICIENTS,
      "CAU123",
    );
    expect(result).toEqual({
      kind: "AUTHOR_COEFFICIENTS",
      blockedReason: "SUM_MISMATCH",
      deltaMillionths: COEFFICIENT_SCALE - 1_100_000,
    });
    expect((result as { deltaMillionths: number }).deltaMillionths).toBeLessThan(0);
  });

  it("returns GENERATE_AND_SEND/canGenerate:false when the sum is full but the plant has no CAU", () => {
    expect(
      selectSharingAgreementNextStep(agreement(SharingAgreementResponseStatus.DRAFT), FULL_SUM_COEFFICIENTS, undefined),
    ).toEqual({ kind: "GENERATE_AND_SEND", canGenerate: false, blockedReason: "NO_REGULATORY_CODE" });
  });

  it("treats a blank/whitespace-only CAU the same as missing", () => {
    expect(
      selectSharingAgreementNextStep(agreement(SharingAgreementResponseStatus.DRAFT), FULL_SUM_COEFFICIENTS, "   "),
    ).toEqual({ kind: "GENERATE_AND_SEND", canGenerate: false, blockedReason: "NO_REGULATORY_CODE" });
  });

  it("returns GENERATE_AND_SEND/canGenerate:true when the sum is full and the plant has a CAU", () => {
    expect(
      selectSharingAgreementNextStep(agreement(SharingAgreementResponseStatus.DRAFT), FULL_SUM_COEFFICIENTS, "ES1234567890123456AB1F"),
    ).toEqual({ kind: "GENERATE_AND_SEND", canGenerate: true });
  });

  it("returns RECORD_APPLICATION_DATES with the pending count for a PUBLISHED agreement with pending coefficients", () => {
    expect(
      selectSharingAgreementNextStep(
        agreement(SharingAgreementResponseStatus.PUBLISHED),
        PUBLISHED_WITH_PENDING_COEFFICIENTS,
        "ES1234567890123456AB1F",
      ),
    ).toEqual({ kind: "RECORD_APPLICATION_DATES", pendingCount: 1 });
  });

  it("returns ALL_DONE for a PUBLISHED agreement whose coefficients are all APPLIED", () => {
    expect(
      selectSharingAgreementNextStep(
        agreement(SharingAgreementResponseStatus.PUBLISHED),
        PUBLISHED_ALL_APPLIED_COEFFICIENTS,
        "ES1234567890123456AB1F",
      ),
    ).toEqual({ kind: "ALL_DONE" });
  });
});
