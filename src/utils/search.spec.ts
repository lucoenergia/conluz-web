import { describe, expect, test } from "vitest";
import { normalizeForSearch, normalizePersonalId } from "./search";

describe("normalizeForSearch", () => {
  test("strips accents so 'histórico' and 'historico' normalize identically", () => {
    expect(normalizeForSearch("histórico")).toBe(normalizeForSearch("historico"));
  });

  test("lowercases", () => {
    expect(normalizeForSearch("HISTÓRICO")).toBe("historico");
  });
});

describe("normalizePersonalId", () => {
  test("writes a DNI the way it is stored: upper case, with no spaces, dots or hyphens", () => {
    expect(normalizePersonalId(" 12.345.678-z ")).toBe("12345678Z");
    expect(normalizePersonalId("x 1234567-l")).toBe("X1234567L");
  });
});
