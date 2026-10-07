// The derivation must not depend on where the device is: run it in a zone that
// is never Madrid's offset, so reading local time anywhere would show.
process.env.TZ = "America/New_York";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { twelveMonthRangeOf } from "./twelveMonthRange";

describe("twelveMonthRangeOf (#201)", () => {
  beforeEach(() => {
    // A device clock far from every reference month below: counting back from
    // it instead of the reference would start the range in 2030.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-02-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts eleven months before the reference month and ends where the server ended it (August 2026)", () => {
    expect(
      twelveMonthRangeOf({ startDate: "2026-07-31T22:00:00Z", endDate: "2026-08-31T21:00:00Z" }),
    ).toEqual({ startDate: "2025-09-01T00:00:00+02:00", endDate: "2026-08-31T21:00:00Z" });
  });

  it("keeps the reference month's end verbatim, in whatever form the server wrote it", () => {
    const end = "2026-08-31T23:00:00+02:00";
    expect(twelveMonthRangeOf({ startDate: "2026-08-01T00:00:00+02:00", endDate: end }).endDate).toBe(end);
  });

  it("crosses a year boundary: a January reference starts in February of the year before", () => {
    expect(twelveMonthRangeOf({ startDate: "2026-12-31T23:00:00Z", endDate: "2027-01-31T22:00:00Z" })).toEqual({
      startDate: "2026-02-01T00:00:00+01:00",
      endDate: "2027-01-31T22:00:00Z",
    });
  });

  describe("daylight-saving months", () => {
    it("an October reference (clocks back on the 25th) starts the previous November, in winter time", () => {
      expect(twelveMonthRangeOf({ startDate: "2026-10-01T00:00:00+02:00", endDate: "2026-10-31T23:00:00+01:00" })).toEqual({
        startDate: "2025-11-01T00:00:00+01:00",
        endDate: "2026-10-31T23:00:00+01:00",
      });
    });

    it("a March reference (clocks forward on the 29th) starts the previous April, in summer time", () => {
      expect(twelveMonthRangeOf({ startDate: "2026-03-01T00:00:00+01:00", endDate: "2026-03-31T23:00:00+02:00" })).toEqual({
        startDate: "2025-04-01T00:00:00+02:00",
        endDate: "2026-03-31T23:00:00+02:00",
      });
    });

    it("a range starting in October starts in summer time (September 2026 reference)", () => {
      expect(twelveMonthRangeOf({ startDate: "2026-08-31T22:00:00Z", endDate: "2026-09-30T21:00:00Z" }).startDate).toBe(
        "2025-10-01T00:00:00+02:00",
      );
    });

    it("a range starting in March starts in winter time (February 2027 reference)", () => {
      expect(twelveMonthRangeOf({ startDate: "2027-01-31T23:00:00Z", endDate: "2027-02-28T22:00:00Z" }).startDate).toBe(
        "2026-03-01T00:00:00+01:00",
      );
    });
  });
});
