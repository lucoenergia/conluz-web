import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  formatAverageKilowattHours,
  formatCalendarDay,
  formatCalendarMonth,
  formatEuroAmount,
  formatEuros,
  formatEurosPerKilowattHour,
  formatHourOfDay,
  formatKilowattHourAmount,
  formatKilowattHours,
  formatMass,
  formatMonth,
  formatShortDay,
  formatShortMonth,
} from "./formatEnergyFigures";

// Intl separates the euro sign (and groups digits) with a no-break space.
const normalise = (text: string) => text.replace(/\u00a0/g, " ");

describe("formatKilowattHours", () => {
  it("shows a whole amount without decimals", () => {
    expect(formatKilowattHours(268)).toBe("268 kWh");
  });

  it("keeps up to two decimals of a fractional amount", () => {
    expect(formatKilowattHours(3.44)).toBe("3,44 kWh");
  });

  it("rounds a third decimal away", () => {
    expect(formatKilowattHours(12.567)).toBe("12,57 kWh");
  });

  it("drops trailing zeros", () => {
    expect(formatKilowattHours(12.5)).toBe("12,5 kWh");
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

describe("figures without their unit", () => {
  it.each([0, 3.44, 12.567, 12.5, 268, 1234.5, -0.4])("formatKilowattHourAmount(%s) is formatKilowattHours without the unit", (value) => {
    expect(`${formatKilowattHourAmount(value)} kWh`).toBe(formatKilowattHours(value));
  });

  it.each([0, 12.3, 0.005, 1234.5, 98765.432, -1.2])("formatEuroAmount(%s) is formatEuros without the sign", (value) => {
    expect(`${normalise(formatEuroAmount(value))} €`).toBe(normalise(formatEuros(value)));
  });

  it("writes a euro amount to the cent", () => {
    expect(formatEuroAmount(12.3)).toBe("12,30");
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
  it("writes an average as every other kWh figure: at most two decimals, no trailing zeros", () => {
    expect(formatAverageKilowattHours(0.42)).toBe("0,42 kWh");
    expect(formatAverageKilowattHours(0.5)).toBe("0,5 kWh");
    expect(formatAverageKilowattHours(0.567)).toBe("0,57 kWh");
  });

  it("formats a measured zero as zero", () => {
    expect(formatAverageKilowattHours(0)).toBe("0 kWh");
  });

  it("never rounds a positive average into a zero", () => {
    expect(formatAverageKilowattHours(0.0002)).toBe("menos de 0,01 kWh");
    expect(formatAverageKilowattHours(0.0049)).toBe("menos de 0,01 kWh");
  });

  it("shows an average that rounds up to the second decimal as that figure", () => {
    expect(formatAverageKilowattHours(0.005)).toBe("0,01 kWh");
    expect(formatAverageKilowattHours(0.011)).toBe("0,01 kWh");
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

describe("day labels of a local calendar date (#250)", () => {
  it("labels the day of a local calendar date", () => {
    expect(formatShortDay("2026/07/15")).toBe("15 jul");
    expect(formatShortDay("2026/10/25")).toBe("25 oct");
  });

  it("names the day, month and year of a local calendar date", () => {
    expect(formatCalendarDay("2026/07/01")).toBe("1 de julio de 2026");
    expect(formatCalendarDay("2026/12/31")).toBe("31 de diciembre de 2026");
  });

  it("reads only the API's shape, so a drifted fixture fails loudly", () => {
    expect(formatShortDay("2026-07-15")).toBe("Invalid Date");
  });
});

describe("formatHourOfDay (#201)", () => {
  it("writes the hour of the local day", () => {
    expect(formatHourOfDay(0)).toBe("0 h");
    expect(formatHourOfDay(23)).toBe("23 h");
  });
});

describe("formatMass (#403)", () => {
  it("writes a mass below a tonne in whole kilograms", () => {
    expect(formatMass(850)).toBe("850 kg");
    expect(formatMass(850.4)).toBe("850 kg");
    expect(formatMass(0)).toBe("0 kg");
  });

  it("writes a mass from a tonne on in tonnes, with at most one decimal comma", () => {
    expect(formatMass(1234.5)).toBe("1,2 t");
    expect(formatMass(1000)).toBe("1 t");
    expect(formatMass(15_750)).toBe("15,8 t");
  });

  it("writes a mass that rounds to a whole tonne in tonnes", () => {
    expect(formatMass(999.6)).toBe("1 t");
    expect(formatMass(999.4)).toBe("999 kg");
  });
});
