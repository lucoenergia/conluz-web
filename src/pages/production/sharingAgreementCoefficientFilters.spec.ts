import { describe, expect, it } from "vitest";
import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { filterSharingAgreementCoefficients } from "./sharingAgreementCoefficientFilters";

const { APPLIED, PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;

const coefficients: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "1", supply: { name: "Vivienda Histórico", code: "ES0031300000000001AB" }, coefficient: 0.3, applicationState: APPLIED },
  { coefficientId: "2", supply: { name: "Local Comercial", code: "ES0031300000000002CD" }, coefficient: 0.5, applicationState: PENDING },
  { coefficientId: "3", supply: { name: "Nave Industrial", code: "ES0031300000000003EF" }, coefficient: 0, applicationState: APPLIED },
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
