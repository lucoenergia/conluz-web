import { describe, expect, it } from "vitest";
import {
  ASSIGNED_UNUSED_GROUP,
  COMPLETE_TEXT,
  CONSUMPTION_GROUP,
  GRID_IMPORT_SERIES,
  MEASURED_ZERO_KWH_TEXT,
  SELF_CONSUMPTION_SERIES,
  SURPLUS_SERIES,
  axisOf,
  toConsumptionSeriesView,
  type SlotView,
} from "./consumptionSeries";
import type { HistoricalPeriod } from "./historicalPeriod";
import {
  HOME,
  membershipDay,
  membershipGapDay,
  membershipMonth,
  membershipPartialDay,
  supplyBucket,
  supplyGapDay,
  supplyMeasuredZeroDay,
} from "./historicalAnalysis.testData";

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
