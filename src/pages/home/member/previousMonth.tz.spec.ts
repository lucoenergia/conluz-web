import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectDeviceTimeZone } from "../../../test/deviceTimeZone";
import { monthBefore } from "./monthBounds";
import { previousMonthOf } from "./previousMonth";

// Runs in the `app-time-zone` Vitest project: the device is in New York, so a
// month bounded in the device's zone instead of Europe/Madrid would carry
// New York's offsets and midnights.

describe("UI-HOM-011 a month counted back from the reference month is half-open, in Madrid, wherever the device is (#324)", () => {
  beforeEach(() => {
    // A device clock far from every reference month below: deriving from it
    // instead of the reference would give February 2031's previous month.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-02-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  it("UI-HOM-011 AC1 -- the month before August 2026 is [00:00 on 1 July, 00:00 on 1 August)", () => {
    expect(previousMonthOf("2026-08-01T00:00:00+02:00")).toEqual({
      startDate: "2026-07-01T00:00:00+02:00",
      endDate: "2026-08-01T00:00:00+02:00",
    });
  });

  it("UI-HOM-011 AC2 -- the month before November 2026 starts in summer time and ends at 00:00 on 1 November in winter time", () => {
    expect(previousMonthOf("2026-11-01T00:00:00+01:00")).toEqual({
      startDate: "2026-10-01T00:00:00+02:00",
      endDate: "2026-11-01T00:00:00+01:00",
    });
  });

  it("UI-HOM-011 AC2 -- February 2027, before March, ends at 00:00 on 1 March", () => {
    expect(previousMonthOf("2027-03-01T00:00:00+01:00")).toEqual({
      startDate: "2027-02-01T00:00:00+01:00",
      endDate: "2027-03-01T00:00:00+01:00",
    });
  });

  it("UI-HOM-011 a month counted further back is bounded the same way (November 2025, nine months before August 2026)", () => {
    expect(monthBefore("2026-08-01T00:00:00+02:00", 9)).toEqual({
      startDate: "2025-11-01T00:00:00+01:00",
      endDate: "2025-12-01T00:00:00+01:00",
    });
  });
});
