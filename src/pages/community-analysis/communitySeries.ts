import type {
  CommunityDailyEnergyBucketResponse,
  CommunityHourlyEnergyBucketResponse,
  CommunityMonthlyEnergyBucketResponse,
} from "../../api/models";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import type { HistoricalPeriod } from "../../components/period/historicalPeriod";
import { slotStateText } from "../../components/evolution/slotStateText";
import {
  hourKey,
  supplyCountSignal,
  toEvolutionView,
  type EvolutionCopy,
  type EvolutionView,
  type SegmentDefinition,
  type SeriesDefinition,
  type SeriesLook,
  type SlotSignal,
} from "../../components/evolution/evolutionSeries";

// The energy series of "Energía de la comunidad" (#403) on the evolution
// charts (#401): the three community bucket kinds, read into one definition
// each, and the page's words for them.

/** The buckets of the period's granularity, tagged by the series they came from. */
export type CommunitySeries =
  | { kind: "hourly"; buckets: CommunityHourlyEnergyBucketResponse[] }
  | { kind: "daily"; buckets: CommunityDailyEnergyBucketResponse[] }
  | { kind: "monthly"; buckets: CommunityMonthlyEnergyBucketResponse[] };

export type CommunitySegment = "selfConsumption" | "surplus";

export const SELF_CONSUMPTION_SEGMENT = "Se usó en la comunidad";
export const SURPLUS_SEGMENT = "Se fue a la red";

/** Both segments stack into one bar: the energy that reached the community's supplies. */
export const COMMUNITY_GROUP = "community";

const SEGMENTS: readonly SegmentDefinition<CommunitySegment>[] = [
  {
    key: "selfConsumption",
    label: SELF_CONSUMPTION_SEGMENT,
    color: ENERGY_COLORS.community,
    group: COMMUNITY_GROUP,
    technicalTerm: "autoconsumo",
  },
  {
    key: "surplus",
    label: SURPLUS_SEGMENT,
    color: ENERGY_COLORS.exported,
    group: COMMUNITY_GROUP,
    technicalTerm: "excedentes",
  },
];

/** How the community chart is drawn: its two segments, and no savings (UI-CAN-007). */
export const COMMUNITY_LOOK: SeriesLook<CommunitySegment> = { segments: SEGMENTS };

/** The words of the community evolution card (#403). */
export const COMMUNITY_EVOLUTION_COPY: EvolutionCopy = {
  title: {
    hourly: "La energía de la comunidad hora a hora",
    daily: "La energía de la comunidad día a día",
    monthly: "La energía de la comunidad mes a mes",
  },
  legendGroups: [{ heading: "Energía de los puntos de la comunidad", segments: ["selfConsumption", "surplus"] }],
  caption: {
    wide: "Cada barra es la energía que llegó a los puntos de suministro de la comunidad: la parte verde se usó en la comunidad y la morada se fue a la red.",
    narrow:
      "Cada fila es la energía que llegó a los puntos de suministro de la comunidad: la parte verde se usó en la comunidad y la morada se fue a la red.",
  },
  rowHeader: "Total",
  rowsLabel: (unit) => `Energía de la comunidad por ${unit}`,
  // The community series has no savings, so no savings rows are drawn.
  savingsRowsLabel: (unit) => `Ahorro por ${unit}`,
  stateText: (state, granularity) => slotStateText(state, granularity).long,
  partialNotice: ({ where, reported, total }) =>
    `En ${where} solo hay datos de ${reported} de los ${total} puntos de suministro de la comunidad.`,
};

type CommunityBucket = Pick<CommunityDailyEnergyBucketResponse, "selfConsumptionKWh" | "surplusKWh" | "suppliesWithData" | "supplyCount">;

/**
 * A community bucket's state: a gap when a segment is null (no supply had
 * data) or no supply reached the coverage threshold; partial when only some
 * did (CEM-006).
 */
export function communitySignal(bucket: CommunityBucket): SlotSignal {
  if (bucket.selfConsumptionKWh === null || bucket.surplusKWh === null) return { kind: "gap" };
  return supplyCountSignal(bucket);
}

/** A null segment is read only on a gap, whose figures are never drawn or shown. */
const valuesOf = (bucket: CommunityBucket): Record<CommunitySegment, number> => ({
  selfConsumption: bucket.selfConsumptionKWh ?? 0,
  surplus: bucket.surplusKWh ?? 0,
});

/** A day or a month is keyed by its `date` string, never parsed as an instant. */
const byDate: SeriesDefinition<CommunityBucket & { date: string }, CommunitySegment> = {
  segments: SEGMENTS,
  read: (bucket) => ({ timeKey: bucket.date, values: valuesOf(bucket) }),
  signal: communitySignal,
};

/** An hour is keyed by its `startsAt` instant, never by `date` and `time`, which two hours share on the day the clocks go back. */
const byHour: SeriesDefinition<CommunityBucket & { startsAt: string }, CommunitySegment> = {
  segments: SEGMENTS,
  read: (bucket) => ({ timeKey: hourKey(bucket.startsAt), values: valuesOf(bucket) }),
  signal: communitySignal,
};

/** The community evolution chart of the period (UI-CAN-007). */
export function toCommunitySeriesView(period: HistoricalPeriod, series: CommunitySeries): EvolutionView<CommunitySegment> {
  return series.kind === "hourly"
    ? toEvolutionView(period, byHour, series.buckets, COMMUNITY_EVOLUTION_COPY)
    : toEvolutionView(period, byDate, series.buckets, COMMUNITY_EVOLUTION_COPY);
}
