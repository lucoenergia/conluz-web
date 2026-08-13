import { describe, expect, test } from "vitest";
import { filterSharingAgreements, normalizeForSearch } from "./sharingAgreementFilters";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";

describe("normalizeForSearch", () => {
  test("strips accents so 'histórico' and 'historico' normalize identically", () => {
    expect(normalizeForSearch("histórico")).toBe(normalizeForSearch("historico"));
  });

  test("lowercases", () => {
    expect(normalizeForSearch("HISTÓRICO")).toBe("historico");
  });
});

describe("filterSharingAgreements", () => {
  const agreements: SharingAgreementResponse[] = [
    { id: "1", name: "Acuerdo Histórico Norte", notes: "", status: SharingAgreementResponseStatus.SUPERSEDED },
    { id: "2", name: "Reparto vecinos", notes: "Pendiente de revisión histórica", status: SharingAgreementResponseStatus.DRAFT },
    { id: "3", name: "Reparto activo", notes: "", status: SharingAgreementResponseStatus.PUBLISHED },
  ];

  test("matches an accent-insensitive, case-insensitive query against name", () => {
    const result = filterSharingAgreements(agreements, "historico", "all");
    expect(result.map((a) => a.id)).toEqual(["1"]);
  });

  test("matches the query against notes as well as name", () => {
    const result = filterSharingAgreements(agreements, "revision", "all");
    expect(result.map((a) => a.id)).toEqual(["2"]);
  });

  test("filters by status using the enum, not the display label", () => {
    const result = filterSharingAgreements(agreements, "", SharingAgreementResponseStatus.PUBLISHED);
    expect(result.map((a) => a.id)).toEqual(["3"]);
  });

  test("combines search and status filters", () => {
    const result = filterSharingAgreements(agreements, "reparto", SharingAgreementResponseStatus.DRAFT);
    expect(result.map((a) => a.id)).toEqual(["2"]);
  });

  test("'all' status filter returns every item regardless of search", () => {
    const result = filterSharingAgreements(agreements, "", "all");
    expect(result).toHaveLength(3);
  });

  test("empty search text does not filter anything out", () => {
    const result = filterSharingAgreements(agreements, "   ", "all");
    expect(result).toHaveLength(3);
  });
});
