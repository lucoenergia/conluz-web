import { describe, expect, test } from "vitest";
import { normalizeForSearch } from "./search";

describe("normalizeForSearch", () => {
  test("strips accents so 'histórico' and 'historico' normalize identically", () => {
    expect(normalizeForSearch("histórico")).toBe(normalizeForSearch("historico"));
  });

  test("lowercases", () => {
    expect(normalizeForSearch("HISTÓRICO")).toBe("historico");
  });
});
