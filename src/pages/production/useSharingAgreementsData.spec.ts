import { describe, expect, test } from "vitest";
import { computeSharingAgreementCounts, isNotFoundError } from "./useSharingAgreementsData";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";

describe("computeSharingAgreementCounts", () => {
  test("returns zeroed counts for an empty list", () => {
    expect(computeSharingAgreementCounts([])).toEqual({ total: 0, drafts: 0, historicos: 0 });
  });

  test("counts drafts and históricos independently from the total", () => {
    const agreements: SharingAgreementResponse[] = [
      { status: SharingAgreementResponseStatus.DRAFT },
      { status: SharingAgreementResponseStatus.DRAFT },
      { status: SharingAgreementResponseStatus.PUBLISHED },
      { status: SharingAgreementResponseStatus.SUPERSEDED },
    ];
    expect(computeSharingAgreementCounts(agreements)).toEqual({ total: 4, drafts: 2, historicos: 1 });
  });

  test("treats an undefined or unrecognized status as neither draft nor histórico", () => {
    const agreements: SharingAgreementResponse[] = [{ status: undefined }, {}];
    expect(computeSharingAgreementCounts(agreements)).toEqual({ total: 2, drafts: 0, historicos: 0 });
  });
});

describe("isNotFoundError", () => {
  test("returns true for a 404 response error", () => {
    expect(isNotFoundError({ response: { status: 404 } })).toBe(true);
  });

  test("returns false for other status codes", () => {
    expect(isNotFoundError({ response: { status: 500 } })).toBe(false);
  });

  test("returns false for null or undefined", () => {
    expect(isNotFoundError(null)).toBe(false);
    expect(isNotFoundError(undefined)).toBe(false);
  });
});
