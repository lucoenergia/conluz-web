import { describe, expect, it } from "vitest";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { filterSharingAgreementCoefficients } from "./sharingAgreementCoefficientFilters";

const { APPLIED, PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN } = SharingAgreementPartitionCoefficientResponseEndState;

const coefficients: SharingAgreementPartitionCoefficientResponse[] = [
  {
    coefficientId: "1",
    supply: { id: "s1", name: "Vivienda Histórico", code: "ES0031300000000001AB" },
    coefficient: 0.3,
    validFrom: "2024-01-01T00:00:00Z",
    validTo: null,
    applicationState: APPLIED,
    endState: OPEN,
    endDate: null,
  },
  {
    coefficientId: "2",
    supply: { id: "s2", name: "Local Comercial", code: "ES0031300000000002CD" },
    coefficient: 0.5,
    validFrom: null,
    validTo: null,
    applicationState: PENDING,
    endState: OPEN,
    endDate: null,
  },
  {
    coefficientId: "3",
    supply: { id: "s3", name: "Nave Industrial", code: "ES0031300000000003EF" },
    coefficient: 0,
    validFrom: "2024-02-01T00:00:00Z",
    validTo: null,
    applicationState: APPLIED,
    endState: OPEN,
    endDate: null,
  },
];

describe("filterSharingAgreementCoefficients", () => {
  it("returns everything when search is empty and filter is 'all'", () => {
    expect(filterSharingAgreementCoefficients(coefficients, "", "all")).toHaveLength(3);
  });

  it("matches by supply name, case- and accent-insensitively", () => {
    const result = filterSharingAgreementCoefficients(coefficients, "historico", "all");
    expect(result).toEqual([coefficients[0]]);
  });

  it("matches by supply code (CUPS)", () => {
    const result = filterSharingAgreementCoefficients(coefficients, "0002CD", "all");
    expect(result).toEqual([coefficients[1]]);
  });

  it("filters by applicationState", () => {
    const result = filterSharingAgreementCoefficients(coefficients, "", APPLIED);
    expect(result).toEqual([coefficients[0], coefficients[2]]);
  });

  it("combines search and state filters", () => {
    const result = filterSharingAgreementCoefficients(coefficients, "Nave", APPLIED);
    expect(result).toEqual([coefficients[2]]);
  });

  it("never drops a coefficient: 0 row from search or state filtering", () => {
    const bySearch = filterSharingAgreementCoefficients(coefficients, "Industrial", "all");
    expect(bySearch).toEqual([coefficients[2]]);

    const byState = filterSharingAgreementCoefficients(coefficients, "", APPLIED);
    expect(byState).toContainEqual(coefficients[2]);
  });
});
