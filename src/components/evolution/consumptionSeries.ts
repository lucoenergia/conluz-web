import type {
  MembershipDailyConsumptionBucketResponse,
  MembershipHourlyConsumptionBucketResponse,
  MembershipMonthlyConsumptionBucketResponse,
  SupplyConsumptionBucketResponse,
  SupplyHourlyConsumptionBucketResponse,
} from "../../api/models";
import { ENERGY_COLORS, SAVINGS_COLOR } from "../EnergyFigures/energyColors";
import type { HistoricalPeriod } from "../period/historicalPeriod";
import { slotStateText } from "./slotStateText";
import {
  hourKey,
  toEvolutionView,
  type EvolutionCopy,
  type EvolutionSlot,
  type EvolutionView,
  type SegmentDefinition,
  type SeriesDefinition,
  type SlotSignal,
} from "./evolutionSeries";

// The consumption series of "Mi consumo y ahorro" (#250, #378) on the
// evolution charts (#401): the six membership and supply bucket kinds, read
// into one definition each, and the page's words for them.

/** The buckets of the selected scope and granularity, tagged by the series they came from: each marks its states its own way. */
export type ConsumptionSeries =
  | { kind: "membershipHourly"; buckets: MembershipHourlyConsumptionBucketResponse[] }
  | { kind: "membershipDaily"; buckets: MembershipDailyConsumptionBucketResponse[] }
  | { kind: "membershipMonthly"; buckets: MembershipMonthlyConsumptionBucketResponse[] }
  | { kind: "supplyHourly"; buckets: SupplyHourlyConsumptionBucketResponse[] }
  | { kind: "supplyDaily"; buckets: SupplyConsumptionBucketResponse[] }
  | { kind: "supplyMonthly"; buckets: SupplyConsumptionBucketResponse[] };

export type ConsumptionSegment = "selfConsumption" | "gridImport" | "surplus";

/** A slot of the consumption charts, its figures also named one by one, as the data table and the CSV read them (#251). */
export interface SlotView extends EvolutionSlot<ConsumptionSegment> {
  selfConsumptionKWh: number | null;
  gridImportKWh: number | null;
  surplusKWh: number | null;
  /**
   * Below sm, the row's consumption figure: community energy plus grid energy,
   * the bar the chart draws, since a bucket carries no total (UI-HIS-025).
   * Null on a gap.
   */
  consumptionKWh: number | null;
  selfConsumptionText: string | null;
  gridImportText: string | null;
  surplusText: string | null;
}

export interface ConsumptionSeriesView extends EvolutionView<ConsumptionSegment> {
  slots: SlotView[];
}

export const SELF_CONSUMPTION_SERIES = "De la comunidad";
export const GRID_IMPORT_SERIES = "De la red";
export const SURPLUS_SERIES = "Se fue a la red";
export const SAVINGS_SERIES = "Ahorro estimado";

/**
 * The technical term a home term carries after it, in muted type, wherever
 * the page pairs them (UI-HIS-027). A technical term never appears alone.
 */
export const TECHNICAL_TERM: Readonly<Partial<Record<string, string>>> = {
  [SELF_CONSUMPTION_SERIES]: "autoconsumo",
  [SURPLUS_SERIES]: "excedentes",
};

/** The stack the consumption bar is made of, and the separate bar beside it. */
export const CONSUMPTION_GROUP = "consumption";
export const ASSIGNED_UNUSED_GROUP = "assignedUnused";

export { COMPLETE_TEXT } from "./slotStateText";

/** The tooltip line, and a row's detail line below sm, of a plant's own supply. */
export const PLANT_TOOLTIP_TEXT = "En el punto de la planta, «se fue a la red» siempre es 0 kWh.";

const SEGMENTS: readonly SegmentDefinition<ConsumptionSegment>[] = [
  {
    key: "selfConsumption",
    label: SELF_CONSUMPTION_SERIES,
    color: ENERGY_COLORS.community,
    group: CONSUMPTION_GROUP,
    technicalTerm: TECHNICAL_TERM[SELF_CONSUMPTION_SERIES],
  },
  { key: "gridImport", label: GRID_IMPORT_SERIES, color: ENERGY_COLORS.grid, group: CONSUMPTION_GROUP },
  {
    key: "surplus",
    label: SURPLUS_SERIES,
    color: ENERGY_COLORS.exported,
    group: ASSIGNED_UNUSED_GROUP,
    technicalTerm: TECHNICAL_TERM[SURPLUS_SERIES],
  },
];

/** The words of the consumption evolution card (#250, #361). */
export const CONSUMPTION_EVOLUTION_COPY: EvolutionCopy = {
  title: { hourly: "Tu energía hora a hora", daily: "Tu energía día a día", monthly: "Tu energía mes a mes" },
  legendGroups: [
    { heading: "Tu consumo", segments: ["selfConsumption", "gridImport"] },
    { heading: "Asignada que no usaste", segments: ["surplus"] },
  ],
  // Where the separate bar sits, on each layout (UI-HIS-017).
  caption: {
    wide: "La barra apilada es tu consumo. La barra morada, a su lado, es energía asignada que no usaste: no forma parte de tu consumo.",
    narrow: "La barra gruesa es tu consumo. La fina morada, debajo, es energía asignada que no usaste: no forma parte de tu consumo.",
  },
  rowHeader: "Consumo",
  rowsLabel: (unit) => `Tu energía por ${unit}`,
  savingsRowsLabel: (unit) => `Tu ahorro estimado por ${unit}`,
  stateText: (state, granularity) => slotStateText(state, granularity).long,
  partialNotice: ({ where, reported, total }) => `En ${where} solo hay datos de ${reported} de tus ${total} puntos.`,
};

type ConsumptionFigures = Pick<SupplyConsumptionBucketResponse, "selfConsumptionKWh" | "gridImportKWh" | "surplusKWh">;

const valuesOf = (bucket: ConsumptionFigures): Record<ConsumptionSegment, number> => ({
  selfConsumption: bucket.selfConsumptionKWh,
  gridImport: bucket.gridImportKWh,
  surplus: bucket.surplusKWh,
});

type MembershipBucket = Pick<
  MembershipHourlyConsumptionBucketResponse,
  "savingsEur" | "suppliesWithData" | "supplyCount" | "selfConsumptionKWh" | "gridImportKWh" | "surplusKWh"
>;

/** A membership bucket's state: a gap is `savingsEur: null`; partial is `suppliesWithData < supplyCount`. */
function membershipSignal(bucket: MembershipBucket): SlotSignal {
  if (bucket.savingsEur === null) return { kind: "gap" };
  if (bucket.suppliesWithData < bucket.supplyCount) return { kind: "partial", reported: bucket.suppliesWithData, total: bucket.supplyCount };
  return null;
}

type SupplyBucket = Pick<SupplyConsumptionBucketResponse, "obtainMethod" | "selfConsumptionKWh" | "gridImportKWh" | "surplusKWh" | "savingsEur">;

/** A supply bucket's state: a gap is `obtainMethod: null`, whose zeros and 0.00 € are placeholders, not readings. */
function supplySignal(bucket: SupplyBucket): SlotSignal {
  return bucket.obtainMethod === null ? { kind: "gap" } : null;
}

const MEMBERSHIP_SAVINGS = {
  label: SAVINGS_SERIES,
  color: SAVINGS_COLOR,
  read: (bucket: MembershipBucket) => bucket.savingsEur ?? 0,
  isZero: (bucket: MembershipBucket) => (bucket.savingsEur ?? 0) === 0,
};

const SUPPLY_SAVINGS = {
  label: SAVINGS_SERIES,
  color: SAVINGS_COLOR,
  read: (bucket: SupplyBucket) => bucket.savingsEur,
  isZero: (bucket: SupplyBucket) => bucket.savingsEur === 0,
};

/**
 * Each series' definition (#250, #378). A day or a month is keyed by its
 * `date` string, never parsed as an instant. An hour is keyed by its
 * `startsAt` instant, never by `date` and `time`, which two hours share on the
 * day the clocks go back.
 */
const membershipByDate: SeriesDefinition<MembershipBucket & { date: string }, ConsumptionSegment> = {
  segments: SEGMENTS,
  read: (bucket) => ({ timeKey: bucket.date, values: valuesOf(bucket) }),
  signal: membershipSignal,
  savings: MEMBERSHIP_SAVINGS,
};

const membershipByHour: SeriesDefinition<MembershipBucket & { startsAt: string }, ConsumptionSegment> = {
  segments: SEGMENTS,
  read: (bucket) => ({ timeKey: hourKey(bucket.startsAt), values: valuesOf(bucket) }),
  signal: membershipSignal,
  savings: MEMBERSHIP_SAVINGS,
};

const supplyByDate: SeriesDefinition<SupplyBucket & { date: string }, ConsumptionSegment> = {
  segments: SEGMENTS,
  read: (bucket) => ({ timeKey: bucket.date, values: valuesOf(bucket) }),
  signal: supplySignal,
  savings: SUPPLY_SAVINGS,
};

const supplyByHour: SeriesDefinition<SupplyBucket & { startsAt: string }, ConsumptionSegment> = {
  segments: SEGMENTS,
  read: (bucket) => ({ timeKey: hourKey(bucket.startsAt), values: valuesOf(bucket) }),
  signal: supplySignal,
  savings: SUPPLY_SAVINGS,
};

/** How the consumption charts are drawn, whichever series they show. */
export const CONSUMPTION_LOOK = { segments: SEGMENTS, savings: { label: SAVINGS_SERIES, color: SAVINGS_COLOR } };

function evolutionViewOf(period: HistoricalPeriod, series: ConsumptionSeries): EvolutionView<ConsumptionSegment> {
  switch (series.kind) {
    case "membershipHourly":
      return toEvolutionView(period, membershipByHour, series.buckets, CONSUMPTION_EVOLUTION_COPY);
    case "membershipDaily":
    case "membershipMonthly":
      return toEvolutionView(period, membershipByDate, series.buckets, CONSUMPTION_EVOLUTION_COPY);
    case "supplyHourly":
      return toEvolutionView(period, supplyByHour, series.buckets, CONSUMPTION_EVOLUTION_COPY);
    case "supplyDaily":
    case "supplyMonthly":
      return toEvolutionView(period, supplyByDate, series.buckets, CONSUMPTION_EVOLUTION_COPY);
  }
}

/**
 * The consumption evolution charts of the period (#250), and the slots the
 * data table and the CSV read (#251): the evolution view of the series, with
 * each slot's figures also named one by one. A slot's state follows its
 * series: a membership bucket stored by no supply, or a supply bucket with no
 * record, is a gap; a membership bucket some supplies did not store is partial.
 */
export function toConsumptionSeriesView(period: HistoricalPeriod, series: ConsumptionSeries): ConsumptionSeriesView {
  const view = evolutionViewOf(period, series);
  return {
    ...view,
    slots: view.slots.map((slot) => ({
      ...slot,
      selfConsumptionKWh: slot.values.selfConsumption,
      gridImportKWh: slot.values.gridImport,
      surplusKWh: slot.values.surplus,
      consumptionKWh: slot.total,
      selfConsumptionText: slot.texts.selfConsumption,
      gridImportText: slot.texts.gridImport,
      surplusText: slot.texts.surplus,
    })),
  };
}
