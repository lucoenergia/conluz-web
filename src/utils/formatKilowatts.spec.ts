import { describe, expect, it } from "vitest";
import { formatKilowatts } from "./formatKilowatts";

describe("formatKilowatts", () => {
  it("formats with a Spanish decimal comma and 2 decimals", () => {
    expect(formatKilowatts(15)).toBe("15,00 kW");
  });

  it("formats a non-integer value", () => {
    expect(formatKilowatts(6.2)).toBe("6,20 kW");
  });

  it("formats 0", () => {
    expect(formatKilowatts(0)).toBe("0,00 kW");
  });

  it("matches the mock-up: 7.5% of a 100 kW agreement is 7,50 kW", () => {
    expect(formatKilowatts(0.075 * 100)).toBe("7,50 kW");
  });

  it("accepts formatting overrides", () => {
    expect(formatKilowatts(15, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe("15 kW");
  });
});
