import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectDeviceTimeZone } from "../../test/deviceTimeZone";
import { anchorFromPeriodStart, resolvePeriod, type CalendarDay, type PeriodSelection } from "./historicalPeriod";

// Runs in the `app-time-zone` Vitest project: the device is in New York, so a
// bound built in the device's zone instead of Europe/Madrid would carry New
// York's offsets and midnights, and a period counted from the device clock
// would come out of 2031 below.

const day = (year: number, month: number, dayOfMonth: number): CalendarDay => ({ year, month, day: dayOfMonth });
const custom = (from: CalendarDay, to: CalendarDay): PeriodSelection => ({ kind: "custom", from, to });

describe("UI-HIS-005 AC5 -- every period is bounded in Madrid, from the anchor alone, wherever and whenever the device is (#248)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-02-15T03:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  it("UI-HIS-005 AC5 -- the anchor month is read in Madrid from the server's period start", () => {
    expect(anchorFromPeriodStart("2026-09-01T00:00:00+02:00")).toEqual({ year: 2026, month: 9 });
  });

  it.each<[string, { year: number; month: number }, PeriodSelection, { startDate: string; endDate: string; granularity: string }]>([
    [
      "AC1 62 days",
      { year: 2026, month: 9 },
      custom(day(2026, 7, 1), day(2026, 8, 31)),
      { startDate: "2026-07-01T00:00:00+02:00", endDate: "2026-09-01T00:00:00+02:00", granularity: "daily" },
    ],
    [
      "AC1 63 days",
      { year: 2026, month: 9 },
      custom(day(2026, 7, 1), day(2026, 9, 1)),
      { startDate: "2026-07-01T00:00:00+02:00", endDate: "2026-10-01T00:00:00+02:00", granularity: "monthly" },
    ],
    [
      "AC2 snapped",
      { year: 2026, month: 9 },
      custom(day(2025, 3, 15), day(2026, 8, 20)),
      { startDate: "2025-03-01T00:00:00+01:00", endDate: "2026-09-01T00:00:00+02:00", granularity: "monthly" },
    ],
    [
      "AC3 across the October change",
      { year: 2026, month: 11 },
      custom(day(2026, 9, 15), day(2026, 11, 13)),
      { startDate: "2026-09-15T00:00:00+02:00", endDate: "2026-11-14T00:00:00+01:00", granularity: "daily" },
    ],
    [
      "AC4 Este año",
      { year: 2026, month: 9 },
      { kind: "year" },
      { startDate: "2026-01-01T00:00:00+01:00", endDate: "2026-10-01T00:00:00+02:00", granularity: "monthly" },
    ],
    [
      "AC4 Últimos 12 meses",
      { year: 2026, month: 9 },
      { kind: "last12" },
      { startDate: "2025-10-01T00:00:00+02:00", endDate: "2026-10-01T00:00:00+02:00", granularity: "monthly" },
    ],
    [
      "Último mes publicado",
      { year: 2026, month: 9 },
      { kind: "latest" },
      { startDate: "2026-09-01T00:00:00+02:00", endDate: "2026-10-01T00:00:00+02:00", granularity: "daily" },
    ],
  ])("UI-HIS-005 AC5 -- %s gives the Madrid bounds", (_, anchor, selection, expected) => {
    const resolution = resolvePeriod(anchor, selection);
    expect(resolution.status === "ok" && resolution.period).toMatchObject(expected);
  });

  it("UI-HIS-005 AC5 -- anchor December 2026: 'Este año' is 2027, whatever year the device says it is", () => {
    expect(resolvePeriod({ year: 2026, month: 12 }, { kind: "year" })).toEqual({ status: "yearEmpty", year: 2027 });
  });
});
