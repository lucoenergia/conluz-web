import { describe, expect, it } from "vitest";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import type { HistoricalPeriod } from "../../components/period/historicalPeriod";
import { COMMUNITY_EVOLUTION_COPY, COMMUNITY_LOOK, communitySignal, toCommunitySeriesView } from "./communitySeries";
import { SEPTEMBER_DAYS, communityDay, communityGapDay, communityHour, communityMonth } from "./communityAnalysis.testData";

const SEPTEMBER: HistoricalPeriod = {
  startDate: "2026-09-01T00:00:00+02:00",
  endDate: "2026-10-01T00:00:00+02:00",
  granularity: "daily",
  label: "Del 1 al 30 de septiembre de 2026",
};
const ONE_DAY: HistoricalPeriod = {
  startDate: "2026-09-15T00:00:00+02:00",
  endDate: "2026-09-16T00:00:00+02:00",
  granularity: "hourly",
  label: "15 de septiembre de 2026",
};
const Q3: HistoricalPeriod = {
  startDate: "2026-07-01T00:00:00+02:00",
  endDate: "2026-10-01T00:00:00+02:00",
  granularity: "monthly",
  label: "De julio a septiembre de 2026",
};

describe("UI-CAN-007 a community bucket's state comes from its supplies (CEM-006)", () => {
  it("UI-CAN-007 is a gap when no supply reported, or when a segment is null", () => {
    expect(communitySignal(communityDay("2026/09/01", { suppliesWithData: 0 }))).toEqual({ kind: "gap" });
    expect(communitySignal(communityDay("2026/09/01", { selfConsumptionKWh: null }))).toEqual({ kind: "gap" });
    expect(communitySignal(communityDay("2026/09/01", { surplusKWh: null }))).toEqual({ kind: "gap" });
  });

  it("UI-CAN-007 is partial when only some supplies reported, and complete when all did", () => {
    expect(communitySignal(communityDay("2026/09/01", { suppliesWithData: 2, supplyCount: 3 }))).toEqual({ kind: "partial", reported: 2, total: 3 });
    expect(communitySignal(communityDay("2026/09/01", { suppliesWithData: 3, supplyCount: 3 }))).toBeNull();
  });

  it("UI-CAN-007 marks gaps, partial days and measured zeros, more than one of each, in words and marks (AC10)", () => {
    const buckets = SEPTEMBER_DAYS.map((date) => {
      if (date === "2026/09/03" || date === "2026/09/04") return communityGapDay(date);
      if (date === "2026/09/10" || date === "2026/09/11") return communityDay(date, { suppliesWithData: 2, supplyCount: 3 });
      if (date === "2026/09/20" || date === "2026/09/21") return communityDay(date, { selfConsumptionKWh: 0, surplusKWh: 0 });
      return communityDay(date);
    });
    const view = toCommunitySeriesView(SEPTEMBER, { kind: "daily", buckets });
    const stateOf = (date: string) => view.slots.find((slot) => slot.key === date)!.state.kind;

    expect(["2026/09/03", "2026/09/04"].map(stateOf)).toEqual(["gap", "gap"]);
    expect(["2026/09/10", "2026/09/11"].map(stateOf)).toEqual(["partial", "partial"]);
    expect(["2026/09/20", "2026/09/21"].map(stateOf)).toEqual(["measuredZero", "measuredZero"]);
    expect(stateOf("2026/09/01")).toBe("complete");

    // A gap is never drawn as 0.
    expect(view.energySeries.every((series) => series.data[2] === null && series.data[3] === null)).toBe(true);
    expect(view.gapsNotice).toBe("Faltan datos del 3 al 4 de septiembre de 2026. Los totales suman solo los días con datos.");
    expect(view.partialNotice).toBe(
      "En los días del 10 al 11 de septiembre de 2026 solo hay datos de 2 de los 3 puntos de suministro de la comunidad. Esos días se marcan como parciales.",
    );
    const points = view.energyAnnotations?.points ?? [];
    expect(points.filter((point) => point.marker?.size === 5).map((point) => point.x)).toEqual(["2026/09/03", "2026/09/04"]);
    expect(points.filter((point) => point.label?.text === "*").map((point) => point.x)).toEqual(["2026/09/10", "2026/09/11"]);
    expect(points.filter((point) => point.marker?.size === 4).map((point) => point.x)).toEqual(["2026/09/20", "2026/09/21"]);
  });

  it("UI-CAN-007 a day the series omits is a gap", () => {
    const view = toCommunitySeriesView(SEPTEMBER, { kind: "daily", buckets: SEPTEMBER_DAYS.slice(1).map((date) => communityDay(date)) });
    expect(view.slots[0].state.kind).toBe("gap");
  });
});

describe("UI-CAN-007 the chart stacks the two segments, with no savings", () => {
  it("UI-CAN-007 stacks self-consumption and surplus in one group", () => {
    const view = toCommunitySeriesView(SEPTEMBER, { kind: "daily", buckets: [communityDay("2026/09/01", { selfConsumptionKWh: 10.25, surplusKWh: 4.5 })] });

    expect(view.energySeries.map(({ name, group }) => ({ name, group }))).toEqual([
      { name: "Se usó en la comunidad", group: "community" },
      { name: "Se fue a la red", group: "community" },
    ]);
    expect(view.energySeries.map((series) => series.data[0])).toEqual([10.25, 4.5]);
  });

  it("UI-CAN-007 has no savings series, savings look or savings figures", () => {
    const view = toCommunitySeriesView(SEPTEMBER, { kind: "daily", buckets: SEPTEMBER_DAYS.map((date) => communityDay(date)) });

    expect(view.savingsSeries).toEqual([]);
    expect(view.savingsAnnotations).toBeUndefined();
    expect(COMMUNITY_LOOK.savings).toBeUndefined();
    expect(view.slots.every((slot) => slot.savingsEur === null && slot.savingsText === null)).toBe(true);
  });

  it("UI-CAN-009 draws self-consumption in ENERGY_COLORS.community and surplus in ENERGY_COLORS.exported, and nothing in gold", () => {
    expect(COMMUNITY_LOOK.segments.map(({ label, color }) => [label, color])).toEqual([
      ["Se usó en la comunidad", ENERGY_COLORS.community],
      ["Se fue a la red", ENERGY_COLORS.exported],
    ]);
    expect(COMMUNITY_LOOK.segments.some(({ color }) => color === ENERGY_COLORS.assigned)).toBe(false);
  });

  it("UI-CAN-007 titles the card by granularity", () => {
    expect(COMMUNITY_EVOLUTION_COPY.title).toEqual({
      hourly: "La energía de la comunidad hora a hora",
      daily: "La energía de la comunidad día a día",
      monthly: "La energía de la comunidad mes a mes",
    });
  });
});

describe("UI-CAN-007 granularities", () => {
  it("UI-CAN-007 matches an hour by its instant, not by its date and time", () => {
    const buckets = [communityHour("2026/09/15", 14, { selfConsumptionKWh: 3.5, surplusKWh: 1.25 }), communityHour("2026/09/15", 15)];
    const view = toCommunitySeriesView(ONE_DAY, { kind: "hourly", buckets });
    const slot = view.slots.find((candidate) => candidate.hour?.clockHour === 14)!;

    expect(view.slots).toHaveLength(24);
    expect(slot.values).toEqual({ selfConsumption: 3.5, surplus: 1.25 });
    expect(view.slots.find((candidate) => candidate.hour?.clockHour === 0)!.state.kind).toBe("gap");
  });

  it("UI-CAN-007 reads a month by its date", () => {
    const buckets = [communityMonth("2026/07/01"), communityMonth("2026/08/01", { suppliesWithData: 1 }), communityMonth("2026/09/01")];
    const view = toCommunitySeriesView(Q3, { kind: "monthly", buckets });

    expect(view.slots.map((slot) => slot.state.kind)).toEqual(["complete", "partial", "complete"]);
  });
});

describe("UI-CAN-003 the mobile row's total (accepted exception, UI-HIS-025)", () => {
  it("UI-CAN-003 is the client-side sum of the two segments, the only figure the client adds", () => {
    const view = toCommunitySeriesView(SEPTEMBER, {
      kind: "daily",
      buckets: [communityDay("2026/09/01", { selfConsumptionKWh: 10.125, surplusKWh: 3.45 }), communityDay("2026/09/02", { selfConsumptionKWh: 0.3, surplusKWh: 0.15 })],
    });

    expect(view.slots[0].total).toBeCloseTo(13.575, 9);
    expect(view.slots[1].total).toBeCloseTo(0.45, 9);
  });
});
