import { describe, expect, it } from "vitest";
import { formatCalendarDate } from "./formatCalendarDate";

describe("formatCalendarDate", () => {
  it("formats a Z-suffixed instant using its date component", () => {
    expect(formatCalendarDate("2024-05-23T00:00:00Z")).toBe("23 de mayo de 2024");
  });

  it("trusts the date digits as written, never reinterpreting a non-UTC offset in UTC", () => {
    // Madrid midnight (+02:00) — a naive `new Date(x).toLocaleDateString(..., { timeZone: "UTC" })`
    // would reinterpret this instant in UTC and roll the day back to June 1st.
    expect(formatCalendarDate("2025-06-02T00:00:00+02:00")).toBe("2 de junio de 2025");
  });

  it("trusts the date digits even when the offset would push the instant into the next UTC day", () => {
    expect(formatCalendarDate("2025-01-01T23:00:00-05:00")).toBe("1 de enero de 2025");
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
