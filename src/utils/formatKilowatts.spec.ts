import { describe, expect, it } from "vitest";
import { formatKilowatts } from "./formatKilowatts";

describe("formatKilowatts", () => {
  it("shows a whole amount without decimals", () => {
    expect(formatKilowatts(63)).toBe("63 kW");
  });

  it("keeps up to two decimals with a Spanish decimal comma, without trailing zeros", () => {
    expect(formatKilowatts(120.5)).toBe("120,5 kW");
    expect(formatKilowatts(120.57)).toBe("120,57 kW");
  });

  it("rounds a third decimal away", () => {
    expect(formatKilowatts(120.567)).toBe("120,57 kW");
  });

  it("formats 0", () => {
    expect(formatKilowatts(0)).toBe("0 kW");
  });

  it("matches the mock-up: 7.5% of a 100 kW agreement is 7,5 kW", () => {
    expect(formatKilowatts(0.075 * 100)).toBe("7,5 kW");
  });
});
