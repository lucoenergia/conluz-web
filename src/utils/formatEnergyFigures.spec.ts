import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  formatAverageKilowattHours,
  formatCalendarMonth,
  formatEuros,
  formatEurosPerKilowattHour,
  formatHourOfDay,
  formatKilowattHours,
  formatMonth,
  formatShortMonth,
} from "./formatEnergyFigures";

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

describe("formatAverageKilowattHours (#201)", () => {
  it("keeps up to three decimals of a fraction of a kWh", () => {
    expect(formatAverageKilowattHours(0.42)).toBe("0,42 kWh");
    expect(formatAverageKilowattHours(0.005)).toBe("0,005 kWh");
  });

  it("formats a measured zero as zero", () => {
    expect(formatAverageKilowattHours(0)).toBe("0 kWh");
  });

  it("never rounds a positive average into a zero", () => {
    expect(formatAverageKilowattHours(0.0002)).toBe("menos de 0,001 kWh");
  });
});

describe("calendar months (#201)", () => {
  // A local calendar date names a day in the community's calendar; read as an
  // instant it would fall on the previous day west of UTC.
  const originalTz = process.env.TZ;
  beforeEach(() => {
    process.env.TZ = "America/Los_Angeles";
  });
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("labels the month of a local calendar date, whatever the device's time zone", () => {
    expect(formatShortMonth("2026/08/01")).toBe("ago");
    expect(formatShortMonth("2027/01/01")).toBe("ene");
  });

  it("names the month and year of a local calendar date", () => {
    expect(formatCalendarMonth("2026/08/01")).toBe("agosto de 2026");
    expect(formatCalendarMonth("2027/01/01")).toBe("enero de 2027");
  });
});

describe("formatHourOfDay (#201)", () => {
  it("writes the hour of the local day", () => {
    expect(formatHourOfDay(0)).toBe("0 h");
    expect(formatHourOfDay(23)).toBe("23 h");
  });
});
