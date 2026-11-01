import { describe, expect, it } from "vitest";
import {
  anchorFromPeriodStart,
  calendarDayCount,
  clampToAnchor,
  parseSelection,
  presetSummary,
  yearPresetName,
  rangeResultText,
  resolvePeriod,
  settleSelection,
  writeSelection,
  type CalendarDay,
  type PeriodResolution,
  type PeriodSelection,
} from "./historicalPeriod";

const SEPTEMBER_2026 = { year: 2026, month: 9 };
const day = (year: number, month: number, dayOfMonth: number): CalendarDay => ({ year, month, day: dayOfMonth });
const custom = (from: CalendarDay, to: CalendarDay): PeriodSelection => ({ kind: "custom", from, to });

function ok(resolution: PeriodResolution) {
  if (resolution.status !== "ok") throw new Error(`expected a period, got ${resolution.status}`);
  return resolution;
}

describe("UI-HIS-005 the anchor is the month the server resolved (#248)", () => {
  it("UI-HIS-005 the anchor is the calendar month the period starts in, read in Madrid", () => {
    expect(anchorFromPeriodStart("2026-09-01T00:00:00+02:00")).toEqual(SEPTEMBER_2026);
    // 22:00 UTC on 31 December is already 1 January in Madrid.
    expect(anchorFromPeriodStart("2026-12-31T23:00:00Z")).toEqual({ year: 2027, month: 1 });
  });

  it("UI-HIS-005 'Último mes publicado' is the anchor month, day by day", () => {
    const { period, title } = ok(resolvePeriod(SEPTEMBER_2026, { kind: "latest" }));
    expect(period).toEqual({
      startDate: "2026-09-01T00:00:00+02:00",
      endDate: "2026-10-01T00:00:00+02:00",
      granularity: "daily",
      label: "Septiembre de 2026",
    });
    expect(title).toBe("Datos de septiembre de 2026");
  });

  it("UI-HIS-005 AC4 -- anchor September 2026: 'Año 2026' is January to September 2026, month by month", () => {
    const { period, title } = ok(resolvePeriod(SEPTEMBER_2026, { kind: "year" }));
    expect(period).toEqual({
      startDate: "2026-01-01T00:00:00+01:00",
      endDate: "2026-10-01T00:00:00+02:00",
      granularity: "monthly",
      label: "De enero a septiembre de 2026",
    });
    expect(title).toBe("Datos de enero a septiembre de 2026");
  });

  it("UI-HIS-005 AC4 -- anchor September 2026: 'Últimos 12 meses' is October 2025 to September 2026, month by month", () => {
    const { period, title } = ok(resolvePeriod(SEPTEMBER_2026, { kind: "last12" }));
    expect(period).toEqual({
      startDate: "2025-10-01T00:00:00+02:00",
      endDate: "2026-10-01T00:00:00+02:00",
      granularity: "monthly",
      label: "De octubre de 2025 a septiembre de 2026",
    });
    expect(title).toBe("Datos de octubre de 2025 a septiembre de 2026");
  });

  it("UI-HIS-005 anchor December 2026: 'Año 2026' is the whole of 2026, month by month", () => {
    const { period } = ok(resolvePeriod({ year: 2026, month: 12 }, { kind: "year" }));
    expect(period).toEqual({
      startDate: "2026-01-01T00:00:00+01:00",
      endDate: "2027-01-01T00:00:00+01:00",
      granularity: "monthly",
      label: "De enero a diciembre de 2026",
    });
  });

  it("UI-HIS-005 anchor January 2027: 'Año 2027' is the 31 days of January, day by day", () => {
    const { period } = ok(resolvePeriod({ year: 2027, month: 1 }, { kind: "year" }));
    expect(period.granularity).toBe("daily");
    expect(period).toMatchObject({ startDate: "2027-01-01T00:00:00+01:00", endDate: "2027-02-01T00:00:00+01:00", label: "Enero de 2027" });
  });

  it("UI-HIS-005 anchor February 2027: 'Año 2027' is 59 days, day by day", () => {
    const resolution = ok(resolvePeriod({ year: 2027, month: 2 }, { kind: "year" }));
    expect(resolution.pickedDays).toBe(59);
    expect(resolution.period).toMatchObject({
      startDate: "2027-01-01T00:00:00+01:00",
      endDate: "2027-03-01T00:00:00+01:00",
      granularity: "daily",
      label: "Del 1 de enero al 28 de febrero de 2027",
    });
  });

  it("UI-HIS-005 a custom range ending after the anchor month cannot be resolved", () => {
    expect(resolvePeriod(SEPTEMBER_2026, custom(day(2026, 9, 1), day(2026, 10, 1)))).toEqual({ status: "unpickable" });
    expect(resolvePeriod(SEPTEMBER_2026, custom(day(2026, 9, 1), day(2026, 9, 30))).status).toBe("ok");
  });

  it("UI-HIS-005 a custom range running backwards cannot be resolved", () => {
    expect(resolvePeriod(SEPTEMBER_2026, custom(day(2026, 9, 2), day(2026, 9, 1)))).toEqual({ status: "unpickable" });
  });

  it.each<[string, PeriodSelection]>([
    ["latest", { kind: "latest" }],
    ["year", { kind: "year" }],
    ["last12", { kind: "last12" }],
    ["a daily custom range", custom(day(2026, 7, 1), day(2026, 8, 31))],
    ["a snapped custom range", custom(day(2025, 3, 15), day(2026, 8, 20))],
    ["a range across the October change", custom(day(2026, 9, 15), day(2026, 11, 13))],
  ])("UI-HIS-005 AC8 -- %s is half-open: both bounds at 00:00 in Madrid, never an inclusive T23:00 end", (_, selection) => {
    const anchor = { year: 2026, month: 11 };
    const { period } = ok(resolvePeriod(anchor, selection));
    for (const bound of [period.startDate, period.endDate]) {
      expect(bound).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\+0[12]:00$/);
    }
    expect(period.endDate).not.toContain("T23:");
    expect(Date.parse(period.startDate)).toBeLessThan(Date.parse(period.endDate));
  });
});

describe("UI-HIS-006 granularity follows calendar days in Madrid (#248)", () => {
  it("UI-HIS-006 counts calendar days, both ends included", () => {
    expect(calendarDayCount(day(2026, 7, 1), day(2026, 8, 31))).toBe(62);
    expect(calendarDayCount(day(2026, 7, 1), day(2026, 7, 1))).toBe(1);
  });

  it("UI-HIS-006 AC1 -- 1 July to 31 August, 62 days, is daily, as picked", () => {
    const resolution = ok(resolvePeriod(SEPTEMBER_2026, custom(day(2026, 7, 1), day(2026, 8, 31))));
    expect(resolution.period).toEqual({
      startDate: "2026-07-01T00:00:00+02:00",
      endDate: "2026-09-01T00:00:00+02:00",
      granularity: "daily",
      label: "Del 1 de julio al 31 de agosto de 2026",
    });
    expect(resolution.title).toBe("Datos del 1 de julio al 31 de agosto de 2026");
    expect(resolution.snapped).toBeNull();
  });

  it("UI-HIS-006 AC1 -- 1 July to 1 September, 63 days, is snapped to July-September, monthly", () => {
    const resolution = ok(resolvePeriod(SEPTEMBER_2026, custom(day(2026, 7, 1), day(2026, 9, 1))));
    expect(resolution.period).toEqual({
      startDate: "2026-07-01T00:00:00+02:00",
      endDate: "2026-10-01T00:00:00+02:00",
      granularity: "monthly",
      label: "De julio a septiembre de 2026",
    });
    expect(resolution.snapped).toMatchObject({ from: day(2026, 7, 1), to: day(2026, 9, 30), months: 3 });
  });

  it("UI-HIS-006 AC2 -- 15 March 2025 to 20 August 2026 is March 2025 to August 2026, monthly, and says so", () => {
    const resolution = ok(resolvePeriod(SEPTEMBER_2026, custom(day(2025, 3, 15), day(2026, 8, 20))));
    expect(resolution.period).toEqual({
      startDate: "2025-03-01T00:00:00+01:00",
      endDate: "2026-09-01T00:00:00+02:00",
      granularity: "monthly",
      label: "De marzo de 2025 a agosto de 2026",
    });
    expect(resolution.snapped?.text).toBe(
      "Elegiste del 15 de marzo de 2025 al 20 de agosto de 2026. Como son más de 62 días, lo mostramos por meses completos: " +
        "de marzo de 2025 a agosto de 2026 (18 meses).",
    );
  });

  it("UI-HIS-006 AC3 -- 60 days across the October change are daily, starting on summer time and ending on winter time", () => {
    const resolution = ok(resolvePeriod({ year: 2026, month: 11 }, custom(day(2026, 9, 15), day(2026, 11, 13))));
    expect(resolution.pickedDays).toBe(60);
    expect(resolution.period).toMatchObject({
      startDate: "2026-09-15T00:00:00+02:00",
      endDate: "2026-11-14T00:00:00+01:00",
      granularity: "daily",
    });
  });

  it("UI-HIS-006 AC3 -- October bounded alone starts at +02:00 and ends at +01:00", () => {
    const { period } = ok(resolvePeriod({ year: 2026, month: 11 }, custom(day(2026, 10, 1), day(2026, 10, 31))));
    expect(period).toMatchObject({ startDate: "2026-10-01T00:00:00+02:00", endDate: "2026-11-01T00:00:00+01:00", label: "Octubre de 2026" });
  });

  it("UI-HIS-006 62 calendar days across the October change, an hour longer than 62 days, stay daily", () => {
    const { period } = ok(resolvePeriod({ year: 2026, month: 12 }, custom(day(2026, 10, 1), day(2026, 12, 1))));
    expect(period.granularity).toBe("daily");
    expect(period.endDate).toBe("2026-12-02T00:00:00+01:00");
  });

  it("UI-HIS-006 a whole range of months longer than 62 days is monthly with nothing snapped", () => {
    const resolution = ok(resolvePeriod(SEPTEMBER_2026, custom(day(2026, 7, 1), day(2026, 9, 30))));
    expect(resolution.period.granularity).toBe("monthly");
    expect(resolution.snapped).toBeNull();
  });

  it("UI-HIS-006 the picker announces the result before it is applied", () => {
    expect(rangeResultText(resolvePeriod(SEPTEMBER_2026, custom(day(2026, 7, 1), day(2026, 8, 31))))).toBe(
      "62 días: se mostrará por días.",
    );
    expect(rangeResultText(resolvePeriod(SEPTEMBER_2026, custom(day(2026, 7, 10), day(2026, 9, 25))))).toBe(
      "78 días: se mostrará por meses, de julio a septiembre de 2026.",
    );
    expect(rangeResultText(resolvePeriod(SEPTEMBER_2026, custom(day(2025, 11, 10), day(2026, 2, 25))))).toBe(
      "108 días: se mostrará por meses, de noviembre de 2025 a febrero de 2026.",
    );
    expect(rangeResultText(resolvePeriod(SEPTEMBER_2026, custom(day(2026, 7, 1), day(2026, 7, 1))))).toBe(
      "1 día: se mostrará por días.",
    );
  });

  it("UI-HIS-005 the year preset is named after the anchor's year, whatever its month", () => {
    expect(yearPresetName(SEPTEMBER_2026)).toBe("Año 2026");
    expect(yearPresetName({ year: 2026, month: 12 })).toBe("Año 2026");
    expect(yearPresetName({ year: 2027, month: 1 })).toBe("Año 2027");
  });

  it("UI-HIS-006 each preset is offered with its period and granularity", () => {
    expect(presetSummary(SEPTEMBER_2026, "latest")).toBe("Septiembre de 2026 · por días");
    expect(presetSummary(SEPTEMBER_2026, "year")).toBe("De enero a septiembre · por meses");
    expect(presetSummary(SEPTEMBER_2026, "last12")).toBe(
      "De octubre de 2025 a septiembre de 2026 · por meses",
    );
    expect(presetSummary({ year: 2027, month: 2 }, "year")).toBe("De enero a febrero · por días");
    expect(presetSummary({ year: 2027, month: 1 }, "year")).toBe("Enero · por días");
    expect(presetSummary({ year: 2026, month: 12 }, "year")).toBe("De enero a diciembre · por meses");
  });
});

describe("UI-HIS-007 a period spans 24 months at most, after snapping (#248)", () => {
  it("UI-HIS-007 a range snapping to exactly 24 months is accepted", () => {
    const { period } = ok(resolvePeriod(SEPTEMBER_2026, custom(day(2024, 10, 15), day(2026, 9, 10))));
    expect(period).toMatchObject({ startDate: "2024-10-01T00:00:00+02:00", endDate: "2026-10-01T00:00:00+02:00", granularity: "monthly" });
  });

  it("UI-HIS-007 a range snapping to 25 months is refused", () => {
    expect(resolvePeriod(SEPTEMBER_2026, custom(day(2024, 9, 1), day(2026, 9, 30)))).toEqual({ status: "tooLong", pickedDays: 760 });
  });

  it("UI-HIS-007 a range under 24 months as picked but 25 once snapped is refused", () => {
    expect(resolvePeriod({ year: 2027, month: 3 }, custom(day(2025, 3, 15), day(2027, 3, 10))).status).toBe("tooLong");
  });
});

describe("UI-HIS-008 a custom range is clamped to the anchor it meets (#248)", () => {
  it("UI-HIS-008 a range ending after the anchor month ends on its last day instead, and the user is told", () => {
    expect(clampToAnchor(custom(day(2026, 7, 10), day(2026, 9, 20)), { year: 2026, month: 8 })).toEqual({
      selection: custom(day(2026, 7, 10), day(2026, 8, 31)),
      adjusted: true,
    });
  });

  it("UI-HIS-008 a range starting after the anchor month falls back to the latest published month, and the user is told", () => {
    expect(clampToAnchor(custom(day(2026, 9, 2), day(2026, 9, 20)), { year: 2026, month: 8 })).toEqual({
      selection: { kind: "latest" },
      adjusted: true,
    });
  });

  it("UI-HIS-008 a range inside the anchor and every preset are left alone", () => {
    const inside = custom(day(2026, 7, 10), day(2026, 8, 31));
    expect(clampToAnchor(inside, { year: 2026, month: 8 })).toEqual({ selection: inside, adjusted: false });
    expect(clampToAnchor({ kind: "year" }, { year: 2026, month: 8 })).toEqual({ selection: { kind: "year" }, adjusted: false });
  });

  it("UI-HIS-008 a clamp that leaves 62 days re-evaluates the granularity to daily", () => {
    const { selection } = clampToAnchor(custom(day(2026, 7, 1), day(2026, 9, 30)), { year: 2026, month: 8 });
    expect(ok(resolvePeriod({ year: 2026, month: 8 }, selection)).period.granularity).toBe("daily");
  });
});

describe("UI-HIS-008 a selection is settled against the anchor it meets, whenever it meets one (#248)", () => {
  const AUGUST = { year: 2026, month: 8 };

  it("UI-HIS-008 a range past the anchor is clamped and told, whether it arrives from a link or a switch", () => {
    expect(settleSelection(custom(day(2026, 7, 10), day(2026, 9, 20)), AUGUST)).toEqual({
      selection: custom(day(2026, 7, 10), day(2026, 8, 31)),
      adjusted: true,
      rewrite: true,
    });
  });

  it("UI-HIS-008 a range starting after the anchor falls back to the latest published month, and is told", () => {
    expect(settleSelection(custom(day(2026, 9, 2), day(2026, 9, 20)), AUGUST)).toEqual({
      selection: { kind: "latest" },
      adjusted: true,
      rewrite: true,
    });
  });

  it("UI-HIS-009 no selection at all falls back to the latest published month, silently", () => {
    expect(settleSelection(null, AUGUST)).toEqual({ selection: { kind: "latest" }, adjusted: false, rewrite: true });
  });

  it("UI-HIS-007 a range over the cap falls back to the latest published month, silently", () => {
    expect(settleSelection(custom(day(2024, 7, 1), day(2026, 8, 31)), AUGUST)).toEqual({
      selection: { kind: "latest" },
      adjusted: false,
      rewrite: true,
    });
  });

  it("UI-HIS-009 a selection the anchor admits is kept, and the address left alone", () => {
    expect(settleSelection({ kind: "year" }, AUGUST)).toEqual({ selection: { kind: "year" }, adjusted: false, rewrite: false });
  });
});

describe("UI-HIS-009 the period is held in the query string (#248)", () => {
  const params = (query: string) => new URLSearchParams(query);

  it.each<[string, PeriodSelection]>([
    ["", { kind: "latest" }],
    ["period=latest", { kind: "latest" }],
    ["period=year", { kind: "year" }],
    ["period=last12", { kind: "last12" }],
    ["period=custom&from=2026-07-01&to=2026-08-31", custom(day(2026, 7, 1), day(2026, 8, 31))],
    ["period=custom&from=2026-07-01&to=2026-07-01", custom(day(2026, 7, 1), day(2026, 7, 1))],
  ])("UI-HIS-009 reads ?%s", (query, selection) => {
    expect(parseSelection(params(query))).toEqual(selection);
  });

  it.each([
    "period=month",
    "period=",
    "period=custom",
    "period=custom&from=2026-07-01",
    "period=custom&from=2026-07-01&to=2026-02-30",
    "period=custom&from=2026-7-1&to=2026-08-31",
    "period=custom&from=2026-09-01&to=2026-08-31",
    "period=year&from=2026-07-01",
    "from=2026-07-01&to=2026-08-31",
  ])("UI-HIS-009 refuses ?%s", (query) => {
    expect(parseSelection(params(query))).toBeNull();
  });

  it("UI-HIS-009 writes a selection next to the other parameters, and reads it back", () => {
    const written = writeSelection(params("supplyId=a&period=custom&from=2026-01-01&to=2026-01-02"), { kind: "year" });
    expect(written.toString()).toBe("supplyId=a&period=year");
    const range = custom(day(2026, 7, 1), day(2026, 8, 31));
    const back = writeSelection(params("supplyId=a"), range);
    expect(back.toString()).toBe("supplyId=a&period=custom&from=2026-07-01&to=2026-08-31");
    expect(parseSelection(back)).toEqual(range);
  });
});
