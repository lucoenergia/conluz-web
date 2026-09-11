import { describe, expect, it } from "vitest";
import { formatCalendarDate } from "./formatCalendarDate";

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
