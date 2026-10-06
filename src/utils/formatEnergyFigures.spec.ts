import { describe, expect, it } from "vitest";
import { formatEuros, formatEurosPerKilowattHour, formatKilowattHours, formatMonth } from "./formatEnergyFigures";

// Intl separates the euro sign (and groups digits) with a no-break space.
const normalise = (text: string) => text.replace(/\u00a0/g, " ");

describe("formatKilowattHours", () => {
  it("shows a whole amount without decimals", () => {
    expect(formatKilowattHours(268)).toBe("268 kWh");
  });

  it("keeps one decimal of a fractional amount", () => {
    expect(formatKilowattHours(3.44)).toBe("3,4 kWh");
  });

  it("formats zero as a figure", () => {
    expect(formatKilowattHours(0)).toBe("0 kWh");
  });
});

describe("formatEuros", () => {
  it("formats to the cent with a decimal comma", () => {
    expect(normalise(formatEuros(12.3))).toBe("12,30 €");
  });
});

describe("formatEurosPerKilowattHour", () => {
  it("shows at least two decimals", () => {
    expect(formatEurosPerKilowattHour(0.15)).toBe("0,15 €/kWh");
  });

  it("does not round a configured price away", () => {
    expect(formatEurosPerKilowattHour(0.123456)).toBe("0,123456 €/kWh");
  });
});

describe("formatMonth", () => {
  it("names the month and year, without a day", () => {
    expect(formatMonth("2026-09-15T10:00:00Z")).toBe("septiembre de 2026");
  });

  // The backend starts the month at Madrid midnight, which is the previous
  // day in UTC.
  it("reads the month in Europe/Madrid, not from the UTC prefix", () => {
    expect(formatMonth("2026-08-31T22:00:00Z")).toBe("septiembre de 2026");
  });
});
