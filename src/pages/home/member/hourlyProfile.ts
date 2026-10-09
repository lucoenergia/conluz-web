import type { ApexOptions } from "apexcharts";
import type { MembershipHourlyProfileBucketResponse, MembershipHourlyProfileResponse } from "../../../api/models";
import { formatAverageKilowattHours, formatHourOfDay, formatMonth } from "../../../utils/formatEnergyFigures";
import { colors } from "../../../theme/tokens";
import { ENERGY_COLORS } from "./energyColors";
import { isPartialMonth } from "./memberHomeMessage";

/** One series at one hour: no sample at all, or an average over its own samples. */
export type HourlyValue = { kind: "no-sample" } | { kind: "average"; kWh: number; samples: number };

export interface HourView {
  hour: number;
  /** The chart's category: "8 h". */
  label: string;
  consumption: HourlyValue;
  production: HourlyValue;
  /** Each series in words, with its own sample count, for the tooltip and the table. */
  consumptionText: string;
  productionText: string;
  /**
   * Whether this is one of the hours when the most assigned energy arrives:
   * the best hours to use electricity. Never set in a month with gaps.
   */
  best: boolean;
}

export type HourlyProfileView =
  | { kind: "nothing-yet" }
  | {
      kind: "profile";
      /** The month the profile covers, as the response states it: "agosto de 2026". */
      month: string;
      hours: HourView[];
      /** Which hours are best, in words: "Mejores horas: de 9 h a 14 h y de 15 h a 18 h". */
      bestHoursText: string;
      /** Whether any hour is marked as best, so the shading has anything to stand for. */
      hasBestHours: boolean;
      /** The background of each hour's column: the best hours stand out, the rest stay clear. */
      columnColors: string[];
      categories: string[];
      series: { name: string; data: (number | null)[] }[];
      colors: string[];
      annotations: ApexOptions["annotations"];
    };

export const CONSUMPTION_SERIES = "Tu consumo";
export const PRODUCTION_SERIES = "Energía asignada";
export const NO_SAMPLE_TEXT = "Sin registros";
export const BEST_HOURS_LABEL = "Mejores horas";

/** How many hours the best-hours lead names: those with the most assigned energy. */
export const BEST_HOURS_COUNT = 4;

const CONSUMPTION_COLOR = ENERGY_COLORS.consumption;
const PRODUCTION_COLOR = ENERGY_COLORS.assigned;

/**
 * A series' value at one hour, from that series' own average and own count.
 * The two series rest on independent counts -- a record can carry consumption
 * alone -- so neither is ever read through the other's.
 */
function valueOf(average: number | null, samples: number): HourlyValue {
  return average === null ? { kind: "no-sample" } : { kind: "average", kWh: average, samples };
}

function textOf(value: HourlyValue): string {
  if (value.kind === "no-sample") return NO_SAMPLE_TEXT;
  return `${formatAverageKilowattHours(value.kWh)} (media de ${value.samples} ${value.samples === 1 ? "registro" : "registros"})`;
}

/**
 * The rule the block's caption states: the best hours to use electricity are
 * the ones when the most assigned energy arrives, whatever was consumed in
 * them, since that is when the community's energy is there to use. The
 * BEST_HOURS_COUNT hours with the highest average, among those that received
 * any; at equal averages the earlier hour is taken, so the lead never depends
 * on the order the response happens to list them in. An hour with no sample
 * or no assigned energy is never best.
 */
function bestHoursOf(hours: Omit<HourView, "best">[]): Set<number> {
  const received = hours.flatMap((hour) =>
    hour.production.kind === "average" && hour.production.kWh > 0 ? [{ hour: hour.hour, kWh: hour.production.kWh }] : [],
  );
  received.sort((a, b) => b.kWh - a.kWh || a.hour - b.hour);
  return new Set(received.slice(0, BEST_HOURS_COUNT).map(({ hour }) => hour));
}

function hourOf(bucket: MembershipHourlyProfileBucketResponse): Omit<HourView, "best"> {
  const consumption = valueOf(bucket.averageConsumptionKWh, bucket.consumptionSampleCount);
  const production = valueOf(bucket.averageAssignedProductionKWh, bucket.assignedProductionSampleCount);
  return {
    hour: bucket.hour,
    label: formatHourOfDay(bucket.hour),
    consumption,
    production,
    consumptionText: textOf(consumption),
    productionText: textOf(production),
  };
}

/**
 * The best hours as consecutive runs, each from its first hour to the end of
 * its last: hours 9 to 17 read "de 9 h a 18 h".
 *
 * A month with gaps names no hours. Its averages rest on part of the month,
 * so which hours came out best would be an artefact of what is missing. This
 * is the same rule that keeps the advice silent on such a month, so the screen
 * holds one rule, not a second threshold.
 */
function bestHoursTextOf(hours: HourView[], complete: boolean): string {
  if (!complete) return `${BEST_HOURS_LABEL}: no se pueden calcular, porque faltan datos de este mes.`;
  const runs: { from: number; to: number }[] = [];
  for (const hour of hours) {
    if (!hour.best) continue;
    const last = runs.at(-1);
    if (last && last.to === hour.hour) last.to = hour.hour + 1;
    else runs.push({ from: hour.hour, to: hour.hour + 1 });
  }
  if (runs.length === 0) return `${BEST_HOURS_LABEL}: este mes no te llegó energía de la comunidad en ninguna hora.`;
  const ranges = runs.map(({ from, to }) => `de ${formatHourOfDay(from)} a ${formatHourOfDay(to)}`);
  const listed = ranges.length === 1 ? ranges[0] : `${ranges.slice(0, -1).join(", ")} y ${ranges.at(-1)}`;
  return `${BEST_HOURS_LABEL}: ${listed}`;
}

const plotted = (value: HourlyValue) => (value.kind === "average" ? value.kWh : null);

type PointAnnotation = NonNullable<NonNullable<ApexOptions["annotations"]>["points"]>[number];

/**
 * A marker on the baseline at one series' bar: hollow where that series has
 * no sample, filled where its average is a measured zero. A bar of zero height
 * and a missing bar would otherwise look the same.
 */
function baselineMarker(hour: HourView, value: HourlyValue, seriesIndex: number, color: string): PointAnnotation[] {
  if (value.kind === "average" && value.kWh !== 0) return [];
  const noSample = value.kind === "no-sample";
  return [
    {
      id: `${noSample ? "no-sample" : "zero"}-${seriesIndex}-${hour.hour}`,
      x: hour.label,
      y: 0,
      seriesIndex,
      marker: {
        size: 4,
        fillColor: noSample ? colors.background.paper : color,
        strokeColor: color,
        strokeWidth: 2,
      },
    },
  ];
}

/**
 * The hourly profile (#201), every decision about what is drawn made here:
 * which hours are gaps and which are measured zeros, series by series, which
 * hours are the best ones (#231), and the words for each. The chart and its
 * table both render this view and compute nothing of their own, so the table
 * proves what the chart is told to draw.
 */
export function toHourlyProfileView(response: MembershipHourlyProfileResponse): HourlyProfileView {
  const complete = !isPartialMonth(response.coverage);
  const measured = response.buckets.map(hourOf);
  const best = complete ? bestHoursOf(measured) : new Set<number>();
  const hours: HourView[] = measured.map((hour) => ({ ...hour, best: best.has(hour.hour) }));
  const anySample = hours.some((hour) => hour.consumption.kind === "average" || hour.production.kind === "average");
  if (!response.period.startDate || !anySample) return { kind: "nothing-yet" };

  return {
    kind: "profile",
    month: formatMonth(response.period.startDate),
    hours,
    bestHoursText: bestHoursTextOf(hours, complete),
    hasBestHours: best.size > 0,
    columnColors: hours.map((hour) => (hour.best ? ENERGY_COLORS.bestHours : "transparent")),
    categories: hours.map((hour) => hour.label),
    series: [
      { name: CONSUMPTION_SERIES, data: hours.map((hour) => plotted(hour.consumption)) },
      { name: PRODUCTION_SERIES, data: hours.map((hour) => plotted(hour.production)) },
    ],
    colors: [CONSUMPTION_COLOR, PRODUCTION_COLOR],
    annotations: {
      points: hours.flatMap((hour) => [
        ...baselineMarker(hour, hour.consumption, 0, CONSUMPTION_COLOR),
        ...baselineMarker(hour, hour.production, 1, PRODUCTION_COLOR),
      ]),
    },
  };
}
