import { describe, expect, it } from "vitest";
import { formatPercentage } from "./formatPercentage";

describe("formatPercentage", () => {
  // Intl.NumberFormat's style: "percent" inserts a no-break space (U+00A0)
  // before the "%" sign, spelled out below as an explicit \u00A0 escape
  // rather than a literal space so the intent is visible in the source.
  it("formats with a Spanish decimal comma and 4 decimals", () => {
    expect(formatPercentage(0.15)).toBe("15,0000\u00A0%");
  });

  it("formats a repeating decimal to 4 significant places", () => {
    expect(formatPercentage(1 / 3)).toBe("33,3333\u00A0%");
  });

  it("formats 100%", () => {
    expect(formatPercentage(1)).toBe("100,0000\u00A0%");
  });

  it("formats 0%", () => {
    expect(formatPercentage(0)).toBe("0,0000\u00A0%");
  });

  it("accepts formatting overrides", () => {
    expect(formatPercentage(0.15, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe("15\u00A0%");
  });
});
