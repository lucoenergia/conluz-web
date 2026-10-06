// The derivation must not depend on where the device is: run it in a zone that
// is never Madrid's offset, so reading local time anywhere would show.
process.env.TZ = "America/New_York";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { previousMonthOf } from "./previousMonth";

describe("previousMonthOf (#200)", () => {
  beforeEach(() => {
    // A device clock far from every reference month below: deriving from it
    // instead of the reference would give February 2031's previous month.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-02-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    // The backend writes the bounds with their local offset; the repo's fixtures in UTC. Both are the same instant.
    ["August 2026 as the backend writes it", "2026-08-01T00:00:00+02:00", "2026-07-01T00:00:00+02:00", "2026-07-31T23:00:00+02:00"],
    ["August 2026 written in UTC", "2026-07-31T22:00:00Z", "2026-07-01T00:00:00+02:00", "2026-07-31T23:00:00+02:00"],
  ])("reads the reference month in the app's time zone: %s", (_label, referenceStart, startDate, endDate) => {
    expect(previousMonthOf(referenceStart)).toEqual({ startDate, endDate });
  });

  describe("month lengths", () => {
    it("the month before a 31-day month ends on the 30th when it has 30 days (May 2026 -> April)", () => {
      expect(previousMonthOf("2026-05-01T00:00:00+02:00")).toEqual({
        startDate: "2026-04-01T00:00:00+02:00",
        endDate: "2026-04-30T23:00:00+02:00",
      });
    });

    it("the month before a 31-day month ends on the 28th in a common year (March 2027 -> February)", () => {
      expect(previousMonthOf("2027-03-01T00:00:00+01:00")).toEqual({
        startDate: "2027-02-01T00:00:00+01:00",
        endDate: "2027-02-28T23:00:00+01:00",
      });
    });

    it("rolls the year back from January (January 2027 -> December 2026)", () => {
      expect(previousMonthOf("2026-12-31T23:00:00Z")).toEqual({
        startDate: "2026-12-01T00:00:00+01:00",
        endDate: "2026-12-31T23:00:00+01:00",
      });
    });
  });

  describe("a month containing a daylight-saving transition carries a different offset on each bound", () => {
    it("October 2026, clocks back on the 25th: starts in summer time, ends in winter time", () => {
      expect(previousMonthOf("2026-11-01T00:00:00+01:00")).toEqual({
        startDate: "2026-10-01T00:00:00+02:00",
        endDate: "2026-10-31T23:00:00+01:00",
      });
    });

    it("March 2026, clocks forward on the 29th: starts in winter time, ends in summer time", () => {
      expect(previousMonthOf("2026-04-01T00:00:00+02:00")).toEqual({
        startDate: "2026-03-01T00:00:00+01:00",
        endDate: "2026-03-31T23:00:00+02:00",
      });
    });
  });

  it("a membership one month old gets the month before it joined, like anyone else (September 2026 -> August)", () => {
    // Whether that month has data is the response's to say, not the derivation's.
    expect(previousMonthOf("2026-08-31T22:00:00Z")).toEqual({
      startDate: "2026-08-01T00:00:00+02:00",
      endDate: "2026-08-31T23:00:00+02:00",
    });
  });
});
