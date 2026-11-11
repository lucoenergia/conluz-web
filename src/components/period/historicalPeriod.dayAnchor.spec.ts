import { describe, expect, it } from "vitest";
import {
  DAY_YEAR,
  LAST_12,
  LAST_30,
  LAST_7,
  LATEST,
  YEAR,
  dayAnchor,
  monthAnchor,
  offeredPresets,
  parseSelection,
  presetSummary,
  resolvePeriod,
  settleSelection,
  type CalendarDay,
  type PeriodResolution,
  type PeriodSelection,
} from "./historicalPeriod";

// The presets and the bounds of a page anchored to a calendar day (#401): no
// page has one yet. The day is 8 November 2026, after the October change, so
// November's bounds carry +01:00 and October's before the change +02:00.

const day = (year: number, month: number, dayOfMonth: number): CalendarDay => ({ year, month, day: dayOfMonth });
const custom = (from: CalendarDay, to: CalendarDay): PeriodSelection => ({ kind: "custom", from, to });
const NOVEMBER_8 = dayAnchor(day(2026, 11, 8));
/** A day-anchored page's presets, "Últimos 7 días" first and by default. */
const DAY_PRESETS = [LAST_7, LAST_30, DAY_YEAR];

function ok(resolution: PeriodResolution) {
  if (resolution.status !== "ok") throw new Error(`expected a period, got ${resolution.status}`);
  return resolution;
}

describe("UI-HIS-005 a day anchor's presets end on the anchor day, bounded in Madrid (#401)", () => {
  it.each<[string, PeriodSelection, { startDate: string; endDate: string; granularity: string }]>([
    ["Últimos 7 días", { kind: "last7" }, { startDate: "2026-11-02T00:00:00+01:00", endDate: "2026-11-09T00:00:00+01:00", granularity: "daily" }],
    ["Últimos 30 días", { kind: "last30" }, { startDate: "2026-10-10T00:00:00+02:00", endDate: "2026-11-09T00:00:00+01:00", granularity: "daily" }],
    ["Año 2026", { kind: "year" }, { startDate: "2026-01-01T00:00:00+01:00", endDate: "2026-11-09T00:00:00+01:00", granularity: "monthly" }],
  ])("UI-HIS-005 AC4 -- %s against 8 November 2026 is half-open, ending at 00:00 on 9 November", (_, selection, expected) => {
    expect(ok(resolvePeriod(NOVEMBER_8, selection, DAY_PRESETS)).period).toMatchObject(expected);
  });

  it("UI-HIS-005 the presets are named, and the year preset after the anchor day's year", () => {
    expect(DAY_PRESETS.map((preset) => preset.name(NOVEMBER_8))).toEqual(["Últimos 7 días", "Últimos 30 días", "Año 2026"]);
    expect(DAY_YEAR.name(dayAnchor(day(2027, 1, 3)))).toBe("Año 2027");
  });

  it("UI-HIS-006 each preset is offered with the period it resolves to and its granularity", () => {
    expect(presetSummary(NOVEMBER_8, LAST_7)).toBe("Del 2 al 8 de noviembre de 2026 · por días");
    expect(presetSummary(NOVEMBER_8, LAST_30)).toBe("Del 10 de octubre al 8 de noviembre de 2026 · por días");
    expect(presetSummary(NOVEMBER_8, DAY_YEAR)).toBe("Del 1 de enero al 8 de noviembre de 2026 · por meses");
  });
});

describe("UI-PLT-011 under a day anchor every range is labelled by days, a monthly one included (#406)", () => {
  it.each<[string, PeriodSelection, string, string]>([
    ["Últimos 7 días", { kind: "last7" }, "Del 2 al 8 de noviembre de 2026", "Datos del 2 al 8 de noviembre de 2026"],
    [
      "Últimos 30 días",
      { kind: "last30" },
      "Del 10 de octubre al 8 de noviembre de 2026",
      "Datos del 10 de octubre al 8 de noviembre de 2026",
    ],
    ["Año 2026", { kind: "year" }, "Del 1 de enero al 8 de noviembre de 2026", "Datos del 1 de enero al 8 de noviembre de 2026"],
  ])("UI-PLT-011 AC5 AC7 -- %s against 8 November 2026 is labelled by its days", (_, selection, label, title) => {
    const resolution = ok(resolvePeriod(NOVEMBER_8, selection, DAY_PRESETS));
    expect(resolution.period.label).toBe(label);
    expect(resolution.title).toBe(title);
  });

  it("UI-PLT-011 AC7 -- a custom range widened to months is labelled from the first of its month to the anchor day", () => {
    const resolution = ok(resolvePeriod(NOVEMBER_8, custom(day(2026, 8, 15), day(2026, 11, 8)), DAY_PRESETS));
    expect(resolution.period.granularity).toBe("monthly");
    expect(resolution.period.label).toBe("Del 1 de agosto al 8 de noviembre de 2026");
  });

  it("UI-PLT-011 a whole calendar month picked under a day anchor is still named by its days", () => {
    const resolution = ok(resolvePeriod(NOVEMBER_8, custom(day(2026, 10, 1), day(2026, 10, 31)), DAY_PRESETS));
    expect(resolution.period.label).toBe("Del 1 al 31 de octubre de 2026");
  });

  it("UI-PLT-011 AC7 -- a month anchor keeps its month labels, as on Mi consumo y ahorro", () => {
    const september = monthAnchor({ year: 2026, month: 9 });
    expect(ok(resolvePeriod(september, { kind: "year" }, [LATEST, YEAR, LAST_12])).period.label).toBe("De enero a septiembre de 2026");
    expect(ok(resolvePeriod(september, { kind: "latest" }, [LATEST, YEAR, LAST_12])).period.label).toBe("Septiembre de 2026");
    expect(ok(resolvePeriod(september, { kind: "last12" }, [LATEST, YEAR, LAST_12])).period.label).toBe(
      "De octubre de 2025 a septiembre de 2026",
    );
  });
});

describe("UI-HIS-006 a day anchor's presets are never hourly (#401)", () => {
  it("UI-HIS-006 AC4 -- the last 7 and 30 days are daily; the year is daily up to 62 days and monthly beyond", () => {
    for (const anchorDay of [day(2026, 1, 1), day(2026, 3, 3), day(2026, 3, 4), day(2026, 11, 8), day(2026, 12, 31)]) {
      const anchor = dayAnchor(anchorDay);
      const granularities = DAY_PRESETS.map((preset) => ok(resolvePeriod(anchor, { kind: preset.value }, DAY_PRESETS)).period.granularity);
      // 1 January to 3 March 2026 is 62 days; to 4 March, 63.
      const year = anchorDay.month < 3 || (anchorDay.month === 3 && anchorDay.day <= 3) ? "daily" : "monthly";
      expect(granularities, `anchored to ${anchorDay.year}-${anchorDay.month}-${anchorDay.day}`).toEqual(["daily", "daily", year]);
    }
  });

  it("UI-HIS-006 a year preset anchored to 1 January is that one day, by days", () => {
    expect(ok(resolvePeriod(dayAnchor(day(2026, 1, 1)), { kind: "year" }, DAY_PRESETS)).period).toMatchObject({
      startDate: "2026-01-01T00:00:00+01:00",
      endDate: "2026-01-02T00:00:00+01:00",
      granularity: "daily",
    });
  });
});

describe("UI-HIS-006 widening a range to whole months never passes the anchor (#401)", () => {
  it("UI-HIS-006 AC5 -- under a day anchor a monthly range ends at the anchor day, not at the end of its month", () => {
    const resolution = ok(resolvePeriod(NOVEMBER_8, custom(day(2026, 8, 15), day(2026, 11, 8)), DAY_PRESETS));
    expect(resolution.period).toMatchObject({
      startDate: "2026-08-01T00:00:00+02:00",
      endDate: "2026-11-09T00:00:00+01:00",
      granularity: "monthly",
    });
    expect(resolution.lastDay).toEqual(day(2026, 11, 8));
  });

  it("UI-HIS-006 under a month anchor the last month is whole, as before", () => {
    const resolution = ok(resolvePeriod(monthAnchor({ year: 2026, month: 11 }), custom(day(2026, 8, 15), day(2026, 11, 8)), [LATEST]));
    expect(resolution.period.endDate).toBe("2026-12-01T00:00:00+01:00");
  });
});

describe("UI-HIS-008 a day anchor bounds a custom range at its own day (#401)", () => {
  it("UI-HIS-008 AC6 -- a custom range ending after the anchor day is unpickable, one ending on it is not", () => {
    expect(resolvePeriod(NOVEMBER_8, custom(day(2026, 11, 1), day(2026, 11, 9)), DAY_PRESETS)).toEqual({ status: "unpickable" });
    expect(resolvePeriod(NOVEMBER_8, custom(day(2026, 11, 1), day(2026, 11, 8)), DAY_PRESETS).status).toBe("ok");
  });

  it("UI-HIS-008 a range ending after the anchor day is clamped to it, and the user told", () => {
    expect(settleSelection(custom(day(2026, 11, 1), day(2026, 11, 20)), NOVEMBER_8, DAY_PRESETS, LAST_7)).toEqual({
      selection: custom(day(2026, 11, 1), day(2026, 11, 8)),
      adjusted: true,
      rewrite: true,
    });
  });

  it("UI-HIS-008 a range starting after the anchor day falls back to the page's default preset", () => {
    expect(settleSelection(custom(day(2026, 11, 9), day(2026, 11, 20)), NOVEMBER_8, DAY_PRESETS, LAST_7)).toEqual({
      selection: { kind: "last7" },
      adjusted: true,
      rewrite: true,
    });
  });
});

describe("UI-HIS-009 a page offers only its own presets for its kind of anchor (#401)", () => {
  const params = (query: string) => new URLSearchParams(query);

  it("UI-HIS-009 AC7 -- only the presets that take the anchor's kind are offered, in the list's order", () => {
    const mixed = [LATEST, LAST_7, YEAR, LAST_30, LAST_12, DAY_YEAR];
    expect(offeredPresets(mixed, NOVEMBER_8)).toEqual([LAST_7, LAST_30, DAY_YEAR]);
    expect(offeredPresets(mixed, monthAnchor({ year: 2026, month: 11 }))).toEqual([LATEST, YEAR, LAST_12]);
  });

  it("UI-HIS-009 AC7 -- a link naming a preset the page does not offer settles to the page's default", () => {
    const parsed = parseSelection(params("period=last12"), DAY_PRESETS, LAST_7);
    expect(parsed).toBeNull();
    expect(settleSelection(parsed, NOVEMBER_8, DAY_PRESETS, LAST_7)).toEqual({ selection: { kind: "last7" }, adjusted: false, rewrite: true });
  });

  it("UI-HIS-009 AC7 -- a listed preset that does not take this kind of anchor cannot be requested, and settles to the default", () => {
    const presets = [LAST_7, LATEST];
    expect(resolvePeriod(NOVEMBER_8, { kind: "latest" }, presets)).toEqual({ status: "unpickable" });
    const parsed = parseSelection(params("period=latest"), presets, LAST_7);
    expect(settleSelection(parsed, NOVEMBER_8, presets, LAST_7)).toEqual({ selection: { kind: "last7" }, adjusted: false, rewrite: true });
  });

  it("UI-HIS-009 no ?period= is the page's default preset, and each of its presets reads back", () => {
    expect(parseSelection(params(""), DAY_PRESETS, LAST_7)).toEqual({ kind: "last7" });
    expect(parseSelection(params("period=last30"), DAY_PRESETS, LAST_7)).toEqual({ kind: "last30" });
    expect(parseSelection(params("period=year"), DAY_PRESETS, LAST_7)).toEqual({ kind: "year" });
  });
});
