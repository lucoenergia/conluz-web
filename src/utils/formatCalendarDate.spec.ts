import { describe, expect, it } from "vitest";
import { formatCalendarDate, formatLocalDate, formatTimeOfDay } from "./formatCalendarDate";

describe("formatCalendarDate", () => {
  it("formats a Z-suffixed instant that stays on the same Madrid calendar day", () => {
    expect(formatCalendarDate("2024-05-23T00:00:00Z")).toBe("23 de mayo de 2024");
  });

  it("rolls a Z-suffixed instant forward into the next Madrid calendar day (CEST, UTC+2)", () => {
    // Backend derives validFrom as `appliedOn.atStartOfDay(Europe/Madrid).toInstant()`, so
    // registering the 10th in summer produces this exact wire value — reading only the raw
    // "2026-09-09" prefix (the previous, buggy approach) would display the 9th instead.
    expect(formatCalendarDate("2026-09-09T22:00:00Z")).toBe("10 de septiembre de 2026");
  });

  it("rolls a Z-suffixed instant forward into the next Madrid calendar day (CET, UTC+1)", () => {
    expect(formatCalendarDate("2025-01-01T23:00:00Z")).toBe("2 de enero de 2025");
  });

  it("returns a dash for undefined input", () => {
    expect(formatCalendarDate(undefined)).toBe("-");
  });

  it("returns a dash for unparseable input", () => {
    expect(formatCalendarDate("garbage")).toBe("-");
  });

  it("accepts formatting overrides", () => {
    expect(formatCalendarDate("2024-05-23", { month: "short" })).toBe("23 may 2024");
  });
});

describe("formatTimeOfDay", () => {
  it("reads the instant in Madrid time, past midnight into the next day (CEST, UTC+2)", () => {
    expect(formatTimeOfDay("2026-08-01T22:30:00Z")).toBe("00:30");
  });

  it("reads the instant in Madrid time in winter (CET, UTC+1)", () => {
    expect(formatTimeOfDay("2026-01-15T12:05:00Z")).toBe("13:05");
  });

  it("returns a dash for undefined or unparseable input", () => {
    expect(formatTimeOfDay(undefined)).toBe("-");
    expect(formatTimeOfDay("garbage")).toBe("-");
  });
});

describe("formatLocalDate", () => {
  it("formats a local date as the day it names, in the long form", () => {
    expect(formatLocalDate("2026-03-01")).toBe("1 de marzo de 2026");
    expect(formatLocalDate("2025-12-31")).toBe("31 de diciembre de 2025");
  });

  it("returns a dash for an empty value, another shape or a day that does not exist", () => {
    expect(formatLocalDate(null)).toBe("-");
    expect(formatLocalDate(undefined)).toBe("-");
    expect(formatLocalDate("2026/03/01")).toBe("-");
    expect(formatLocalDate("2026-03-01T00:00:00Z")).toBe("-");
    expect(formatLocalDate("2026-02-30")).toBe("-");
  });
});
