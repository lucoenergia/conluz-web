import { describe, expect, it } from "vitest";
import { colors } from "../../theme/tokens";
import type { HistoricalPeriod } from "../period/historicalPeriod";
import {
  hoursSignal,
  supplyCountSignal,
  toEvolutionView,
  type EvolutionCopy,
  type SeriesDefinition,
} from "./evolutionSeries";

// The generic evolution layer on synthetic series (#401): no generated API
// type, only buckets shaped the way the community and plant series will be.

const JULY_1_TO_6: HistoricalPeriod = {
  startDate: "2026-07-01T00:00:00+02:00",
  endDate: "2026-07-07T00:00:00+02:00",
  granularity: "daily",
  label: "Del 1 al 6 de julio de 2026",
};

const COPY: Pick<EvolutionCopy, "stateText" | "partialNotice"> = {
  stateText: (state) => state.kind,
  partialNotice: ({ where, reported, total }) => `En ${where}, ${reported} de ${total}.`,
};

/** A community's day: two stacked segments, added up over the supplies that reported. */
interface CommunityDay {
  date: string;
  fromCommunity: number;
  fromGrid: number;
  suppliesWithData: number;
  supplyCount: number;
}

const COMMUNITY: SeriesDefinition<CommunityDay, "fromCommunity" | "fromGrid"> = {
  segments: [
    { key: "fromCommunity", label: "De la comunidad", color: colors.text.primary, group: "consumption" },
    { key: "fromGrid", label: "De la red", color: colors.text.secondary, group: "consumption" },
  ],
  read: (bucket) => ({ timeKey: bucket.date, values: { fromCommunity: bucket.fromCommunity, fromGrid: bucket.fromGrid } }),
  signal: supplyCountSignal,
};

const communityDay = (date: string, overrides: Partial<CommunityDay> = {}): CommunityDay => ({
  date,
  fromCommunity: 2,
  fromGrid: 3,
  suppliesWithData: 3,
  supplyCount: 3,
  ...overrides,
});

/** A plant's day: one segment, added up over the hours that have data. */
interface PlantDay {
  date: string;
  productionKWh: number;
  hoursWithData: number;
  expectedHours: number;
}

const PLANT: SeriesDefinition<PlantDay, "production"> = {
  segments: [{ key: "production", label: "Producción", color: colors.text.primary, group: "production" }],
  read: (bucket) => ({ timeKey: bucket.date, values: { production: bucket.productionKWh } }),
  signal: hoursSignal,
};

const plantDay = (date: string, overrides: Partial<PlantDay> = {}): PlantDay => ({
  date,
  productionKWh: 12.5,
  hoursWithData: 24,
  expectedHours: 24,
  ...overrides,
});

describe("UI-HIS-015 the supply-count signal marks a slot by the supplies that reported (#401)", () => {
  const view = toEvolutionView(
    JULY_1_TO_6,
    COMMUNITY,
    [
      // A day no supply reported is a gap, whatever figures it carries.
      communityDay("2026/07/01", { suppliesWithData: 0 }),
      communityDay("2026/07/02", { suppliesWithData: 0, fromCommunity: 0, fromGrid: 0 }),
      communityDay("2026/07/03", { suppliesWithData: 2 }),
      // Partial even when its figures are 0: they cover only part of the supplies.
      communityDay("2026/07/04", { suppliesWithData: 2, fromCommunity: 0, fromGrid: 0 }),
      communityDay("2026/07/05", { fromCommunity: 0, fromGrid: 0 }),
      communityDay("2026/07/06"),
    ],
    COPY,
  );

  it("UI-HIS-015 AC8 -- 0 of 3 supplies is a gap, 2 of 3 is partial, and both segments at 0 with every supply reporting is a measured zero", () => {
    expect(view.slots.map((slot) => slot.state)).toEqual([
      { kind: "gap" },
      { kind: "gap" },
      { kind: "partial", reported: 2, total: 3 },
      { kind: "partial", reported: 2, total: 3 },
      { kind: "measuredZero" },
      { kind: "complete" },
    ]);
  });

  it("UI-HIS-015 AC8 -- a gap draws nothing, a partial slot keeps its figures, and the two segments stack in one bar", () => {
    expect(view.energySeries.map(({ name, group }) => [name, group])).toEqual([
      ["De la comunidad", "consumption"],
      ["De la red", "consumption"],
    ]);
    expect(view.energySeries[0].data).toEqual([null, null, 2, 0, 0, 2]);
    expect(view.slots.map((slot) => slot.total)).toEqual([null, null, 5, 0, 0, 5]);
  });

  it("UI-HIS-015 AC8 -- the notices count the gaps and name the partial days with their count", () => {
    expect(view.coverageText).toBe("Del 1 al 6 de julio de 2026: 4 de 6 días con datos; faltan 2.");
    expect(view.gapsNotice).toBe("Faltan datos del 1 al 2 de julio de 2026. Los totales suman solo los días con datos.");
    expect(view.partialNotice).toBe("En los días del 3 al 4 de julio de 2026, 2 de 3. Esos días se marcan como parciales.");
  });
});

describe("UI-HIS-015 the hours signal marks a slot by the hours that have data (#401)", () => {
  const view = toEvolutionView(
    JULY_1_TO_6,
    PLANT,
    [
      plantDay("2026/07/01", { hoursWithData: 0 }),
      plantDay("2026/07/02", { hoursWithData: 0, productionKWh: 0 }),
      plantDay("2026/07/03", { hoursWithData: 12 }),
      plantDay("2026/07/04", { hoursWithData: 12, productionKWh: 0 }),
      plantDay("2026/07/05", { productionKWh: 0 }),
      plantDay("2026/07/06"),
    ],
    COPY,
  );

  it("UI-HIS-015 AC9 -- no hour with data is a gap, 12 of 24 is partial, and a stored 0 with every hour is a measured zero", () => {
    expect(view.slots.map((slot) => slot.state)).toEqual([
      { kind: "gap" },
      { kind: "gap" },
      { kind: "partial", reported: 12, total: 24 },
      { kind: "partial", reported: 12, total: 24 },
      { kind: "measuredZero" },
      { kind: "complete" },
    ]);
  });

  it("UI-HIS-015 AC9 -- the single series is drawn as one bar, null on the gaps, with a ring on each gap and a dot on the measured zero", () => {
    expect(view.energySeries).toEqual([{ name: "Producción", group: "production", data: [null, null, 12.5, 0, 0, 12.5] }]);
    const points = view.energyAnnotations?.points ?? [];
    expect(points.filter((point) => point.marker?.size === 5).map((point) => point.x)).toEqual(["2026/07/01", "2026/07/02"]);
    expect(points.filter((point) => point.marker?.size === 4).map((point) => point.x)).toEqual(["2026/07/05"]);
    expect(points.filter((point) => point.label?.text === "*").map((point) => point.x)).toEqual(["2026/07/03", "2026/07/04"]);
  });
});

describe("UI-HIS-015 a series without savings reads and draws none (#401)", () => {
  it("UI-HIS-015 AC10 -- no savings series, markers or figures", () => {
    const view = toEvolutionView(JULY_1_TO_6, PLANT, [plantDay("2026/07/01", { productionKWh: 0 })], COPY);

    expect(view.savingsSeries).toEqual([]);
    expect(view.savingsAnnotations).toBeUndefined();
    expect(view.slots.map((slot) => [slot.savingsEur, slot.savingsText, slot.savingsZero])).toEqual(
      Array(6).fill([null, null, false]),
    );
  });
});
