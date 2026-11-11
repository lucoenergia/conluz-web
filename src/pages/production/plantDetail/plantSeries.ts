import type {
  PlantDailyEnergyBucketResponse,
  PlantHourlyEnergyBucketResponse,
  PlantMonthlyEnergyBucketResponse,
} from "../../../api/models";
import { ENERGY_COLORS } from "../../../components/EnergyFigures/energyColors";
import type { HistoricalPeriod } from "../../../components/period/historicalPeriod";
import { slotStateText } from "../../../components/evolution/slotStateText";
import {
  hourKey,
  hoursSignal,
  toEvolutionView,
  type EvolutionCopy,
  type EvolutionView,
  type SegmentDefinition,
  type SeriesDefinition,
  type SeriesLook,
} from "../../../components/evolution/evolutionSeries";

// The plant's distributor production on the evolution chart (#406): one
// series, the energy the plant exported at its connection point, with no
// savings.

/** The buckets of the period's granularity, tagged by the series they came from. */
export type PlantSeries =
  | { kind: "hourly"; buckets: PlantHourlyEnergyBucketResponse[] }
  | { kind: "daily"; buckets: PlantDailyEnergyBucketResponse[] }
  | { kind: "monthly"; buckets: PlantMonthlyEnergyBucketResponse[] };

export type PlantSegment = "production";

export const PRODUCTION_SEGMENT = "Energía vertida a la red";

const SEGMENTS: readonly SegmentDefinition<PlantSegment>[] = [
  // Gold, the colour production has on every page (UI-PLT-013).
  { key: "production", label: PRODUCTION_SEGMENT, color: ENERGY_COLORS.assigned, group: "production" },
];

/** How the plant chart is drawn: one segment, and no savings. */
export const PLANT_LOOK: SeriesLook<PlantSegment> = { segments: SEGMENTS };

/** The words of the plant's production chart. */
export const PLANT_EVOLUTION_COPY: EvolutionCopy = {
  title: {
    hourly: "Energía vertida a la red hora a hora",
    daily: "Energía vertida a la red día a día",
    monthly: "Energía vertida a la red mes a mes",
  },
  legendGroups: [{ heading: "Producción de la planta", segments: ["production"] }],
  caption: {
    wide: "Cada barra es la energía que la planta vertió a la red, según la distribuidora.",
    narrow: "Cada fila es la energía que la planta vertió a la red, según la distribuidora.",
  },
  rowHeader: "Energía vertida",
  rowsLabel: (unit) => `Energía vertida a la red por ${unit}`,
  // The plant series has no savings, so no savings rows are drawn.
  savingsRowsLabel: (unit) => `Ahorro por ${unit}`,
  // A plant's bucket counts hours, not supplies.
  stateText: (state, granularity) =>
    state.kind === "partial"
      ? `Datos parciales: ${state.reported} de ${state.total} horas con datos.`
      : slotStateText(state, granularity).long,
  partialNotice: ({ where, reported, total }) => `En ${where} solo hay datos de ${reported} de las ${total} horas.`,
};

type PlantBucket = Pick<PlantDailyEnergyBucketResponse, "productionKWh" | "hoursWithData" | "expectedHours">;

/** A null production is read only on a gap (no hour with data), whose figure is never drawn or shown. */
const valuesOf = (bucket: PlantBucket): Record<PlantSegment, number> => ({ production: bucket.productionKWh ?? 0 });

/** A day or a month is keyed by its `date` string, never parsed as an instant. */
const byDate: SeriesDefinition<PlantBucket & { date: string }, PlantSegment> = {
  segments: SEGMENTS,
  read: (bucket) => ({ timeKey: bucket.date, values: valuesOf(bucket) }),
  signal: hoursSignal,
};

/** An hour is keyed by its `startsAt` instant, which two hours never share, even on the day the clocks go back. */
const byHour: SeriesDefinition<PlantBucket & { startsAt: string }, PlantSegment> = {
  segments: SEGMENTS,
  read: (bucket) => ({ timeKey: hourKey(bucket.startsAt), values: valuesOf(bucket) }),
  signal: hoursSignal,
};

/** The plant's production chart over the period (UI-PLT-011). */
export function toPlantSeriesView(period: HistoricalPeriod, series: PlantSeries): EvolutionView<PlantSegment> {
  return series.kind === "hourly"
    ? toEvolutionView(period, byHour, series.buckets, PLANT_EVOLUTION_COPY)
    : toEvolutionView(period, byDate, series.buckets, PLANT_EVOLUTION_COPY);
}
