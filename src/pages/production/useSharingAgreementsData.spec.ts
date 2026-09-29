import { describe, expect, test } from "vitest";
import { computeSharingAgreementCounts, isNotFoundError } from "./useSharingAgreementsData";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";
import { buildSharingAgreement } from "../../test/fixtures";

describe("computeSharingAgreementCounts", () => {
  test("returns zeroed counts for an empty list", () => {
    expect(computeSharingAgreementCounts([])).toEqual({ vigentes: 0, drafts: 0, historicos: 0 });
  });

  test("counts vigentes, drafts and históricos independently", () => {
    const agreements = [
      buildSharingAgreement({ id: "a1", status: SharingAgreementResponseStatus.DRAFT }),
      buildSharingAgreement({ id: "a2", status: SharingAgreementResponseStatus.DRAFT }),
      buildSharingAgreement({ id: "a3", status: SharingAgreementResponseStatus.PUBLISHED }),
      buildSharingAgreement({ id: "a4", status: SharingAgreementResponseStatus.SUPERSEDED }),
    ];
    expect(computeSharingAgreementCounts(agreements)).toEqual({ vigentes: 1, drafts: 2, historicos: 1 });
  });

  test("treats an undefined or unrecognized status as neither vigente, draft nor histórico", () => {
    // Deliberately malformed: the subject of the case is a payload whose status
    // the builder cannot produce, so the cast is the point rather than a shortcut.
    const agreements = [
      { ...buildSharingAgreement(), status: undefined },
      {},
    ] as unknown as SharingAgreementResponse[];
    expect(computeSharingAgreementCounts(agreements)).toEqual({ vigentes: 0, drafts: 0, historicos: 0 });
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
