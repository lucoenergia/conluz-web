import { describe, expect, it } from "vitest";
import {
  ASSIGNED_UNUSED_GROUP,
  COMPLETE_TEXT,
  CONSUMPTION_GROUP,
  GRID_IMPORT_SERIES,
  SELF_CONSUMPTION_SERIES,
  SURPLUS_SERIES,
  toConsumptionSeriesView,
  type SlotView,
} from "./consumptionSeries";
import { MEASURED_ZERO_KWH_TEXT, REPEATED_HOUR_NOTE, axisOf, scaleEnd } from "./evolutionSeries";
import type { HistoricalPeriod } from "../period/historicalPeriod";
import {
  HOME,
  hoursOf,
  membershipDay,
  membershipGapHour,
  membershipHour,
  membershipPartialHour,
  supplyGapHour,
  supplyHour,
  supplyMeasuredZeroHour,
  membershipGapDay,
  membershipMonth,
  membershipPartialDay,
  supplyBucket,
  supplyGapDay,
  supplyMeasuredZeroDay,
} from "./consumptionSeries.testData";

const period = (startDate: string, endDate: string, granularity: HistoricalPeriod["granularity"], label = "Periodo"): HistoricalPeriod => ({
  startDate,
  endDate,
  granularity,
  label,
});

/** 1-5 July 2026, by days. */
const FIVE_JULY_DAYS = period("2026-07-01T00:00:00+02:00", "2026-07-06T00:00:00+02:00", "daily", "Del 1 al 5 de julio de 2026");
/** June-September 2026, by months. */
const FOUR_MONTHS = period("2026-06-01T00:00:00+02:00", "2026-10-01T00:00:00+02:00", "monthly", "De junio a septiembre de 2026");

const slotOf = (slots: SlotView[], key: string) => slots.find((slot) => slot.key === key)!;
const markersAt = (annotations: ReturnType<typeof toConsumptionSeriesView>["energyAnnotations"], key: string) =>
  (annotations?.points ?? []).filter((point) => point.x === key);

describe("toConsumptionSeriesView (#250)", () => {
  describe("supply daily", () => {
    it("UI-HIS-015 a bucket with obtainMethod null is a gap with no values; zeros with obtainMethod set are a measured zero", () => {
      const view = toConsumptionSeriesView(FIVE_JULY_DAYS, {
        kind: "supplyDaily",
        buckets: [supplyBucket("2026/07/01"), supplyGapDay("2026/07/02"), supplyMeasuredZeroDay("2026/07/03")],
      });

      const gap = slotOf(view.slots, "2026/07/02");
      expect(gap.state).toEqual({ kind: "gap" });
      expect([gap.selfConsumptionKWh, gap.gridImportKWh, gap.surplusKWh, gap.savingsEur]).toEqual([null, null, null, null]);
      expect(gap.stateText).toBe("Sin datos: no hay lecturas de este día. No cuenta como 0.");
      expect(view.energySeries.map((series) => series.data[1])).toEqual([null, null, null]);
      expect(view.savingsSeries[0].data[1]).toBeNull();

      const zero = slotOf(view.slots, "2026/07/03");
      expect(zero.state).toEqual({ kind: "measuredZero" });
      expect(zero.stateText).toBe(COMPLETE_TEXT);
      expect([zero.selfConsumptionText, zero.gridImportText, zero.surplusText]).toEqual([
        MEASURED_ZERO_KWH_TEXT,
        MEASURED_ZERO_KWH_TEXT,
        MEASURED_ZERO_KWH_TEXT,
      ]);
      expect(view.energySeries.map((series) => series.data[2])).toEqual([0, 0, 0]);

      expect(slotOf(view.slots, "2026/07/01").state).toEqual({ kind: "complete" });
    });

    it("UI-HIS-015 a bucket with obtainMethod null is a gap even when it carries non-zero values", () => {
      const view = toConsumptionSeriesView(FIVE_JULY_DAYS, {
        kind: "supplyDaily",
        buckets: [supplyBucket("2026/07/01"), supplyBucket("2026/07/02", { obtainMethod: null, selfConsumptionKWh: 3.5, savingsEur: 0.4 })],
      });

      const gap = slotOf(view.slots, "2026/07/02");
      expect(gap.state).toEqual({ kind: "gap" });
      expect(gap.selfConsumptionKWh).toBeNull();
      expect(gap.savingsText).toBeNull();
    });

    it("UI-HIS-015 marks a gap with a ring and a measured zero with a dot on the baseline", () => {
      const view = toConsumptionSeriesView(FIVE_JULY_DAYS, {
        kind: "supplyDaily",
        buckets: [supplyGapDay("2026/07/02"), supplyMeasuredZeroDay("2026/07/03"), supplyBucket("2026/07/04")],
      });

      const [ring] = markersAt(view.energyAnnotations, "2026/07/02");
      const [dot] = markersAt(view.energyAnnotations, "2026/07/03");
      expect(ring).toMatchObject({ y: 0, marker: { size: 5, strokeWidth: 2 } });
      expect(dot).toMatchObject({ y: 0, marker: { size: 4, strokeWidth: 0 } });
      expect(ring.marker!.fillColor).not.toBe(dot.marker!.fillColor);
      expect(markersAt(view.energyAnnotations, "2026/07/04")).toEqual([]);
      expect(markersAt(view.savingsAnnotations, "2026/07/03")).toHaveLength(1);
    });
  });

  describe("supply monthly", () => {
    it("UI-HIS-016 a month the series omits inside the period is a gap slot on the axis", () => {
      const view = toConsumptionSeriesView(FOUR_MONTHS, {
        kind: "supplyMonthly",
        buckets: [supplyBucket("2026/06/01"), supplyBucket("2026/08/01"), supplyBucket("2026/09/01")],
      });

      expect(view.categories).toEqual(["2026/06/01", "2026/07/01", "2026/08/01", "2026/09/01"]);
      expect(slotOf(view.slots, "2026/07/01").state).toEqual({ kind: "gap" });
      expect(slotOf(view.slots, "2026/07/01").stateText).toBe("Sin datos: no hay lecturas de este mes. No cuenta como 0.");
      expect(view.energySeries[0].data).toEqual([5.5, null, 5.5, 5.5]);
      expect(view.gapsNotice).toBe("Faltan datos de julio de 2026. Los totales suman solo los meses con datos.");
    });
  });

  describe("membership", () => {
    it("UI-HIS-015 suppliesWithData 1 of supplyCount 2 is partial, in words that name no supply; savingsEur null is a gap", () => {
      const view = toConsumptionSeriesView(FIVE_JULY_DAYS, {
        kind: "membershipDaily",
        buckets: [membershipDay("2026/07/01"), membershipPartialDay("2026/07/02", 1, 2), membershipGapDay("2026/07/03")],
      });

      const partial = slotOf(view.slots, "2026/07/02");
      expect(partial.state).toEqual({ kind: "partial", reported: 1, total: 2 });
      expect(partial.stateText).toBe("Datos parciales: 1 de 2 puntos con datos.");
      expect(partial.stateText).not.toContain(HOME.name!);
      expect(partial.selfConsumptionKWh).toBe(2.5);

      const gap = slotOf(view.slots, "2026/07/03");
      expect(gap.state).toEqual({ kind: "gap" });
      expect(gap.savingsEur).toBeNull();
      expect(gap.selfConsumptionKWh).toBeNull();
    });

    it("UI-HIS-015 a partial bucket whose energy is all zero stays partial, not a measured zero", () => {
      const view = toConsumptionSeriesView(FIVE_JULY_DAYS, {
        kind: "membershipDaily",
        buckets: [
          membershipDay("2026/07/01"),
          membershipDay("2026/07/02", { suppliesWithData: 1, supplyCount: 2, selfConsumptionKWh: 0, gridImportKWh: 0, surplusKWh: 0, savingsEur: 0 }),
        ],
      });

      expect(slotOf(view.slots, "2026/07/02").state).toEqual({ kind: "partial", reported: 1, total: 2 });
      expect(markersAt(view.energyAnnotations, "2026/07/02").map((point) => point.label?.text)).toEqual(["*"]);
    });

    it("UI-HIS-015 a membership bucket with every supply reporting zeros is a measured zero", () => {
      const view = toConsumptionSeriesView(FIVE_JULY_DAYS, {
        kind: "membershipDaily",
        buckets: [
          membershipDay("2026/07/01"),
          membershipDay("2026/07/02", { selfConsumptionKWh: 0, gridImportKWh: 0, surplusKWh: 0, assignedProductionKWh: 0, savingsEur: 0 }),
        ],
      });

      expect(slotOf(view.slots, "2026/07/02").state).toEqual({ kind: "measuredZero" });
      expect(slotOf(view.slots, "2026/07/01").state).toEqual({ kind: "complete" });
    });

    it("UI-HIS-015 the partial notice names the days by count of reporting supplies; a supply series has none", () => {
      const buckets = [
        membershipPartialDay("2026/07/01", 1, 2),
        membershipPartialDay("2026/07/02", 1, 2),
        membershipDay("2026/07/03"),
        membershipPartialDay("2026/07/04", 1, 2),
      ];
      const view = toConsumptionSeriesView(FIVE_JULY_DAYS, { kind: "membershipDaily", buckets });

      expect(view.partialNotice).toBe(
        "En los días del 1 al 2 de julio de 2026 y el 4 de julio de 2026 solo hay datos de 1 de tus 2 puntos. Esos días se marcan como parciales.",
      );
      expect(
        toConsumptionSeriesView(FIVE_JULY_DAYS, { kind: "supplyDaily", buckets: [supplyBucket("2026/07/01"), supplyBucket("2026/07/02")] })
          .partialNotice,
      ).toBeNull();
    });

    it("UI-HIS-015 a monthly membership month with nothing stored is a gap", () => {
      const view = toConsumptionSeriesView(FOUR_MONTHS, {
        kind: "membershipMonthly",
        buckets: [
          membershipMonth("2026/06/01"),
          membershipMonth("2026/07/01", { savingsEur: null, tariffSource: null, suppliesWithData: 0 }),
          membershipMonth("2026/08/01"),
          membershipMonth("2026/09/01"),
        ],
      });

      expect(view.slots.map((slot) => slot.state.kind)).toEqual(["complete", "gap", "complete", "complete"]);
    });
  });

  describe("the axis", () => {
    it("UI-HIS-016 covers exactly the period's days, half-open: no slot for the day at endDate", () => {
      const keys = toConsumptionSeriesView(FIVE_JULY_DAYS, { kind: "supplyDaily", buckets: [] }).categories;
      expect(keys).toEqual(["2026/07/01", "2026/07/02", "2026/07/03", "2026/07/04", "2026/07/05"]);
    });

    it("UI-HIS-016 covers exactly the period's months, half-open: no slot for the month at endDate", () => {
      const keys = toConsumptionSeriesView(FOUR_MONTHS, { kind: "supplyMonthly", buckets: [] }).categories;
      expect(keys).toEqual(["2026/06/01", "2026/07/01", "2026/08/01", "2026/09/01"]);
    });

    it("UI-HIS-016 has one slot per local day across the October change, each labelled with its own date", () => {
      // 25 October 2026 lasts 25 hours in Madrid: the bounds carry two offsets.
      const acrossChange = period("2026-10-24T00:00:00+02:00", "2026-10-27T00:00:00+01:00", "daily");
      const view = toConsumptionSeriesView(acrossChange, {
        kind: "supplyDaily",
        buckets: [supplyBucket("2026/10/24"), supplyBucket("2026/10/25"), supplyBucket("2026/10/26")],
      });

      expect(view.slots.map((slot) => [slot.key, slot.name])).toEqual([
        ["2026/10/24", "24 de octubre de 2026"],
        ["2026/10/25", "25 de octubre de 2026"],
        ["2026/10/26", "26 de octubre de 2026"],
      ]);
      expect(axisOf(period("2026-03-28T00:00:00+01:00", "2026-03-31T00:00:00+02:00", "daily"))).toHaveLength(3);
    });

    it("UI-HIS-018 labels each slot from its calendar date, and thins a daily axis so labels never overlap", () => {
      const sixtyTwoDays = period("2026-07-01T00:00:00+02:00", "2026-09-01T00:00:00+02:00", "daily");
      const view = toConsumptionSeriesView(sixtyTwoDays, { kind: "supplyDaily", buckets: [] });

      expect(view.slots).toHaveLength(62);
      expect(view.slots.slice(0, 4).map((slot) => slot.axisLabel)).toEqual(["1 jul", "", "", "4 jul"]);
      expect(view.slots.filter((slot) => slot.axisLabel !== "")).toHaveLength(21);
      expect(view.minChartWidth).toBe(62 * 20);
    });

    it("UI-HIS-018 labels months by name, with the year on the first month and on January", () => {
      const view = toConsumptionSeriesView(period("2025-11-01T00:00:00+01:00", "2026-03-01T00:00:00+01:00", "monthly"), {
        kind: "supplyMonthly",
        buckets: [],
      });

      expect(view.slots.map((slot) => [slot.axisLabel, slot.name])).toEqual([
        ["nov 25", "Noviembre de 2025"],
        ["dic", "Diciembre de 2025"],
        ["ene 26", "Enero de 2026"],
        ["feb", "Febrero de 2026"],
      ]);
    });
  });

  describe("the energy chart", () => {
    it("UI-HIS-017 stacks De la comunidad and De la red into one bar, and draws Se fue a la red as a bar of its own", () => {
      const view = toConsumptionSeriesView(FIVE_JULY_DAYS, {
        kind: "supplyDaily",
        buckets: [supplyBucket("2026/07/01"), supplyBucket("2026/07/02", { surplusKWh: 1.25 })],
      });

      expect(view.energySeries.map(({ name, group }) => [name, group])).toEqual([
        [SELF_CONSUMPTION_SERIES, CONSUMPTION_GROUP],
        [GRID_IMPORT_SERIES, CONSUMPTION_GROUP],
        [SURPLUS_SERIES, ASSIGNED_UNUSED_GROUP],
      ]);
      expect(CONSUMPTION_GROUP).not.toBe(ASSIGNED_UNUSED_GROUP);
      expect(view.energySeries[2].data.slice(0, 2)).toEqual([3.25, 1.25]);
    });
  });

  describe("words about the period", () => {
    it("UI-HIS-015 gives one range per run of consecutive gaps", () => {
      const view = toConsumptionSeriesView(FIVE_JULY_DAYS, {
        kind: "supplyDaily",
        buckets: [supplyGapDay("2026/07/01"), supplyGapDay("2026/07/02"), supplyBucket("2026/07/03"), supplyGapDay("2026/07/04"), supplyBucket("2026/07/05")],
      });

      expect(view.gapsNotice).toBe(
        "Faltan datos del 1 al 2 de julio de 2026 y del 4 de julio de 2026. Los totales suman solo los días con datos.",
      );
    });

    it("UI-HIS-015 counts the slots with data in the coverage line", () => {
      const gaps = toConsumptionSeriesView(FIVE_JULY_DAYS, {
        kind: "supplyDaily",
        buckets: [supplyBucket("2026/07/01"), supplyGapDay("2026/07/02"), supplyBucket("2026/07/03")],
      });
      expect(gaps.coverageText).toBe("Del 1 al 5 de julio de 2026: 2 de 5 días con datos; faltan 3.");

      const complete = toConsumptionSeriesView(FIVE_JULY_DAYS, {
        kind: "membershipDaily",
        buckets: ["2026/07/01", "2026/07/02", "2026/07/03", "2026/07/04"].map((date) => membershipDay(date)).concat(membershipPartialDay("2026/07/05")),
      });
      expect(complete.coverageText).toBe("Del 1 al 5 de julio de 2026: 5 de 5 días con datos; 1 con datos parciales.");
      expect(complete.gapsNotice).toBeNull();
    });
  });
});

describe("the rows below sm (#361)", () => {
  /** 1 July to 31 August 2026, by days: 62 rows. */
  const JULY_AUGUST = period("2026-07-01T00:00:00+02:00", "2026-09-01T00:00:00+02:00", "daily");
  /** November 2025 to February 2026, by months: crosses a year. */
  const ACROSS_A_YEAR = period("2025-11-01T00:00:00+01:00", "2026-03-01T00:00:00+01:00", "monthly");

  it("UI-HIS-018 every row carries its own label, read from the bucket's date, set apart on a month's first day", () => {
    const view = toConsumptionSeriesView(JULY_AUGUST, { kind: "supplyDaily", buckets: [] });

    expect(view.slots).toHaveLength(62);
    expect(view.slots.map((slot) => slot.rowLabel).slice(29, 33)).toEqual(["30 jul", "31 jul", "1 ago", "2 ago"]);
    expect(view.slots.every((slot) => slot.rowLabel !== "")).toBe(true);
    expect(view.slots.filter((slot) => slot.startsMonthOrYear).map((slot) => slot.key)).toEqual(["2026/07/01", "2026/08/01"]);
  });

  it("UI-HIS-018 a monthly row names its month and year, set apart in January", () => {
    const view = toConsumptionSeriesView(ACROSS_A_YEAR, { kind: "membershipMonthly", buckets: [] });

    expect(view.slots.map((slot) => slot.rowLabel)).toEqual(["nov 25", "dic 25", "ene 26", "feb 26"]);
    expect(view.slots.filter((slot) => slot.startsMonthOrYear).map((slot) => slot.key)).toEqual(["2026/01/01"]);
    expect(view.slots.some((slot) => slot.endsWeek)).toBe(false);
  });

  it("UI-HIS-025 a separator follows every seventh daily row", () => {
    const view = toConsumptionSeriesView(JULY_AUGUST, { kind: "supplyDaily", buckets: [] });

    expect(view.slots.flatMap((slot, index) => (slot.endsWeek ? [index + 1] : []))).toEqual([7, 14, 21, 28, 35, 42, 49, 56]);
  });

  it("UI-HIS-025 a row's consumption is its community energy plus its grid energy, and a gap has none", () => {
    const view = toConsumptionSeriesView(FIVE_JULY_DAYS, {
      kind: "supplyDaily",
      buckets: [
        supplyBucket("2026/07/01", { selfConsumptionKWh: 2.125, gridImportKWh: 7.75, surplusKWh: 1.5 }),
        supplyGapDay("2026/07/02"),
        supplyMeasuredZeroDay("2026/07/03"),
      ],
    });

    expect(view.slots.map((slot) => slot.consumptionKWh)).toEqual([9.875, null, 0, null, null]);
  });

  it("UI-HIS-025 each chart's scale ends on a round figure at or above its longest bar, both energy bars included", () => {
    const view = toConsumptionSeriesView(FIVE_JULY_DAYS, {
      kind: "supplyDaily",
      buckets: [
        supplyBucket("2026/07/01", { selfConsumptionKWh: 3, gridImportKWh: 4, surplusKWh: 1, savingsEur: 0.45 }),
        supplyBucket("2026/07/02", { selfConsumptionKWh: 0.5, gridImportKWh: 0.5, surplusKWh: 8.2, savingsEur: 1.3 }),
      ],
    });

    expect(view.rowScale).toEqual({ energyKWh: 10, savingsEur: 2 });
  });

  it("UI-HIS-025 a period with nothing to draw still has a scale", () => {
    const view = toConsumptionSeriesView(FIVE_JULY_DAYS, { kind: "supplyDaily", buckets: [] });

    expect(view.rowScale).toEqual({ energyKWh: 1, savingsEur: 1 });
  });

  it.each([
    [0.3, 0.5],
    [1, 1],
    [1.01, 2],
    [2.2, 2.5],
    [3, 5],
    [7.5, 10],
    [12, 20],
    [240, 250],
    [0.0004, 0.0005],
  ])("scaleEnd(%s) is %s", (value, end) => {
    expect(scaleEnd(value)).toBeCloseTo(end, 10);
  });
});

// ─── Hourly (#378) ───────────────────────────────────────────────────────────

/** A day picked as a one-day custom range, as the period module bounds it. */
const dayPeriod = (startDate: string, endDate: string, label: string) => period(startDate, endDate, "hourly", label);
const SEPTEMBER_1 = dayPeriod("2026-09-01T00:00:00+02:00", "2026-09-02T00:00:00+02:00", "1 de septiembre de 2026");
const MARCH_29 = dayPeriod("2026-03-29T00:00:00+01:00", "2026-03-30T00:00:00+02:00", "29 de marzo de 2026");
const OCTOBER_25 = dayPeriod("2026-10-25T00:00:00+02:00", "2026-10-26T00:00:00+01:00", "25 de octubre de 2026");
const REPEATED_NAME = `De 02:00 a 03:00 ${REPEATED_HOUR_NOTE}`;

describe("toConsumptionSeriesView, hourly (#378)", () => {
  describe("UI-HIS-028 the axis covers every whole local hour of the day, keyed by its instant", () => {
    it("UI-HIS-028 a day with no clock change has 24 hours, from 00:00 to 23:00, and the next midnight gets no slot", () => {
      const view = toConsumptionSeriesView(SEPTEMBER_1, { kind: "supplyHourly", buckets: [] });

      expect(view.slots).toHaveLength(24);
      expect(view.slots.map((slot) => slot.hour?.clockHour)).toEqual(Array.from({ length: 24 }, (_, hour) => hour));
      expect(view.slots[0].key).toBe("2026-09-01T00:00:00+02:00");
      expect(view.slots[23].key).toBe("2026-09-01T23:00:00+02:00");
      expect(view.slots.map((slot) => slot.name).slice(0, 2)).toEqual(["De 00:00 a 01:00", "De 01:00 a 02:00"]);
      expect(view.slots[14].name).toBe("De 14:00 a 15:00");
      expect(view.slots[23].name).toBe("De 23:00 a 00:00");
      expect(view.slots.map((slot) => slot.rowLabel).slice(0, 3)).toEqual(["0 h", "1 h", "2 h"]);
      expect(view.categories).toEqual(view.slots.map((slot) => slot.key));
    });

    it("UI-HIS-028 AC3 -- the March change day has 23 hours, with no 02:00, and none repeated", () => {
      const view = toConsumptionSeriesView(MARCH_29, { kind: "supplyHourly", buckets: [] });

      expect(view.slots).toHaveLength(23);
      expect(view.slots.map((slot) => slot.hour?.clockHour)).toEqual([0, 1, ...Array.from({ length: 21 }, (_, index) => index + 3)]);
      expect(view.slots.map((slot) => slot.key).slice(1, 3)).toEqual(["2026-03-29T01:00:00+01:00", "2026-03-29T03:00:00+02:00"]);
      expect(view.slots[1].name).toBe("De 01:00 a 02:00");
      expect(view.slots.some((slot) => slot.hour?.repeated)).toBe(false);
      expect(new Set(view.categories).size).toBe(23);
    });

    it("UI-HIS-028 AC3 -- the October change day has 25 hours, two at 02:00 with distinct keys, both named as repeated", () => {
      const view = toConsumptionSeriesView(OCTOBER_25, { kind: "supplyHourly", buckets: [] });

      expect(view.slots).toHaveLength(25);
      expect(new Set(view.categories).size).toBe(25);
      const twoAm = view.slots.filter((slot) => slot.hour?.clockHour === 2);
      expect(twoAm.map((slot) => slot.key)).toEqual(["2026-10-25T02:00:00+02:00", "2026-10-25T02:00:00+01:00"]);
      expect(twoAm.map((slot) => slot.name)).toEqual([REPEATED_NAME, REPEATED_NAME]);
      expect(view.slots.filter((slot) => slot.hour?.repeated)).toHaveLength(2);
      expect(view.slots[1].name).toBe("De 01:00 a 02:00");
      expect(view.slots[4].name).toBe("De 03:00 a 04:00");
    });

    it("UI-HIS-028 AC3 -- buckets are matched by startsAt, so two sharing a date and a time land in the hours they start", () => {
      // The documented bucket's date and time ("2023/04/10", "00:00") stay on both: only startsAt tells them apart.
      const first = supplyHour("2026-10-25T02:00:00+02:00", { selfConsumptionKWh: 1.1, savingsEur: 0.11 });
      const second = supplyHour("2026-10-25T02:00:00+01:00", { selfConsumptionKWh: 2.2, savingsEur: 0.22 });
      expect([first.date, first.time]).toEqual([second.date, second.time]);

      const view = toConsumptionSeriesView(OCTOBER_25, { kind: "supplyHourly", buckets: [second, first] });

      expect(slotOf(view.slots, "2026-10-25T02:00:00+02:00").selfConsumptionKWh).toBe(1.1);
      expect(slotOf(view.slots, "2026-10-25T02:00:00+01:00").selfConsumptionKWh).toBe(2.2);
      expect(view.slots.filter((slot) => slot.state.kind !== "gap")).toHaveLength(2);
    });

    it("UI-HIS-028 a startsAt written with another offset is the same instant, and lands in the same hour", () => {
      const view = toConsumptionSeriesView(OCTOBER_25, {
        kind: "membershipHourly",
        buckets: [membershipHour("2026-10-25T01:00:00Z", { gridImportKWh: 0.9 }), membershipHour("2026-10-25T12:00:00+01:00", { gridImportKWh: 0.4 })],
      });

      expect(slotOf(view.slots, "2026-10-25T02:00:00+01:00").gridImportKWh).toBe(0.9);
      expect(slotOf(view.slots, "2026-10-25T12:00:00+01:00").gridImportKWh).toBe(0.4);
    });
  });

  describe("UI-HIS-018 the hourly labels", () => {
    it("UI-HIS-018 the axis labels every other hour, \"0 h\" to \"22 h\", and the table names each hour as a range", () => {
      const view = toConsumptionSeriesView(SEPTEMBER_1, { kind: "supplyHourly", buckets: [] });

      expect(view.slots.map((slot) => slot.axisLabel)).toEqual(
        Array.from({ length: 24 }, (_, hour) => (hour % 2 === 0 ? `${hour} h` : "")),
      );
      expect(view.slots[14].tableLabel).toBe("14:00–15:00");
      expect(view.slots[23].tableLabel).toBe("23:00–00:00");
      expect(view.minChartWidth).toBe(24 * 20);
    });

    it("UI-HIS-028 both October 02:00 rows of the table say the hour is repeated", () => {
      const view = toConsumptionSeriesView(OCTOBER_25, { kind: "supplyHourly", buckets: [] });

      expect(view.slots.slice(2, 4).map((slot) => slot.tableLabel)).toEqual([
        `02:00–03:00 ${REPEATED_HOUR_NOTE}`,
        `02:00–03:00 ${REPEATED_HOUR_NOTE}`,
      ]);
    });

    it("UI-HIS-021 a day's table label is its tooltip name", () => {
      const view = toConsumptionSeriesView(FIVE_JULY_DAYS, { kind: "supplyDaily", buckets: [] });

      expect(view.slots.map((slot) => slot.tableLabel)).toEqual(view.slots.map((slot) => slot.name));
    });
  });

  describe("UI-HIS-015 AC4 -- the hourly states, by series", () => {
    it("UI-HIS-015 a supply hour with obtainMethod null is a gap with no values, though it reports 0.00 €; zeros with obtainMethod set are a measured zero", () => {
      const [first, second, third] = hoursOf(SEPTEMBER_1.startDate, SEPTEMBER_1.endDate);
      const gapBucket = supplyGapHour(second);
      expect(gapBucket.savingsEur).toBe(0);

      const view = toConsumptionSeriesView(SEPTEMBER_1, {
        kind: "supplyHourly",
        buckets: [supplyHour(first), gapBucket, supplyMeasuredZeroHour(third)],
      });

      const gap = slotOf(view.slots, second);
      expect(gap.state).toEqual({ kind: "gap" });
      expect([gap.selfConsumptionKWh, gap.gridImportKWh, gap.surplusKWh, gap.savingsEur, gap.savingsText]).toEqual([null, null, null, null, null]);
      expect(gap.stateText).toBe("Sin datos: no hay lecturas de esta hora. No cuenta como 0.");
      expect(view.savingsSeries[0].data[1]).toBeNull();
      expect(view.energySeries.map((series) => series.data[1])).toEqual([null, null, null]);

      const zero = slotOf(view.slots, third);
      expect(zero.state).toEqual({ kind: "measuredZero" });
      expect(zero.savingsEur).toBe(0);
      expect(slotOf(view.slots, first).state).toEqual({ kind: "complete" });
    });

    it("UI-HIS-015 a membership hour with savingsEur null is a gap, and one with fewer supplies reporting than it has is partial", () => {
      const [first, second, third] = hoursOf(SEPTEMBER_1.startDate, SEPTEMBER_1.endDate);
      const view = toConsumptionSeriesView(SEPTEMBER_1, {
        kind: "membershipHourly",
        buckets: [membershipHour(first), membershipGapHour(second), membershipPartialHour(third, 1, 2)],
      });

      expect(slotOf(view.slots, first).state).toEqual({ kind: "complete" });
      expect(slotOf(view.slots, second).state).toEqual({ kind: "gap" });
      expect(slotOf(view.slots, second).savingsEur).toBeNull();
      expect(slotOf(view.slots, third).state).toEqual({ kind: "partial", reported: 1, total: 2 });
    });

    it("UI-HIS-015 an hour missing from the response is a gap", () => {
      const [first] = hoursOf(SEPTEMBER_1.startDate, SEPTEMBER_1.endDate);
      const view = toConsumptionSeriesView(SEPTEMBER_1, { kind: "membershipHourly", buckets: [membershipHour(first)] });

      expect(view.slots.filter((slot) => slot.state.kind === "gap")).toHaveLength(23);
      expect(view.slots[5].savingsEur).toBeNull();
    });

    it("UI-HIS-015 the card names the missing and the partial hours, and counts hours", () => {
      const hours = hoursOf(SEPTEMBER_1.startDate, SEPTEMBER_1.endDate);
      const view = toConsumptionSeriesView(SEPTEMBER_1, {
        kind: "membershipHourly",
        buckets: hours.map((startsAt, index) => {
          if (index === 2 || index === 3) return membershipGapHour(startsAt);
          if (index === 9) return membershipGapHour(startsAt);
          if (index === 14) return membershipPartialHour(startsAt, 1, 2);
          return membershipHour(startsAt);
        }),
      });

      expect(view.coverageText).toBe("1 de septiembre de 2026: 21 de 24 horas con datos; faltan 3.");
      expect(view.gapsNotice).toBe("Faltan datos de 02:00 a 04:00 y de 09:00 a 10:00. Los totales suman solo las horas con datos.");
      expect(view.partialNotice).toBe("En la hora de 14:00 a 15:00 solo hay datos de 1 de tus 2 puntos. Esa hora se marca como parcial.");
    });

    it("UI-HIS-015 several partial hours are named as a run", () => {
      const hours = hoursOf(SEPTEMBER_1.startDate, SEPTEMBER_1.endDate);
      const view = toConsumptionSeriesView(SEPTEMBER_1, {
        kind: "membershipHourly",
        buckets: hours.map((startsAt, index) => (index === 14 || index === 15 ? membershipPartialHour(startsAt, 1, 2) : membershipHour(startsAt))),
      });

      expect(view.coverageText).toBe("1 de septiembre de 2026: 24 de 24 horas con datos; 2 con datos parciales.");
      expect(view.partialNotice).toBe("En las horas de 14:00 a 16:00 solo hay datos de 1 de tus 2 puntos. Esas horas se marcan como parciales.");
    });
  });
});
