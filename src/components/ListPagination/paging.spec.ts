import { describe, expect, it } from "vitest";
import { LIST_PAGE_SIZE, pageCountOf, pageOf } from "./paging";

describe("pages of the filtered result (#331)", () => {
  const rows = (count: number) => Array.from({ length: count }, (_, i) => i + 1);

  it("UI-MBR-033 fits 25 rows in one page", () => {
    expect(LIST_PAGE_SIZE).toBe(25);
    expect(pageCountOf(25)).toBe(1);
    expect(pageOf(rows(25), 1)).toHaveLength(25);
  });

  it("UI-MBR-033 splits 26 rows into pages of 25 and 1", () => {
    expect(pageCountOf(26)).toBe(2);
    expect(pageOf(rows(26), 1)).toEqual(rows(25));
    expect(pageOf(rows(26), 2)).toEqual([26]);
  });

  it("UI-MBR-033 clamps a page past the last one to the last one", () => {
    expect(pageOf(rows(26), 5)).toEqual([26]);
  });
});
