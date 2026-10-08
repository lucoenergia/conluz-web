import type { ApexOptions } from "apexcharts";
import type { MembershipHourlyProfileBucketResponse, MembershipHourlyProfileResponse } from "../../../api/models";
import { formatAverageKilowattHours, formatHourOfDay, formatMonth } from "../../../utils/formatEnergyFigures";
import { colors } from "../../../theme/tokens";
import { ENERGY_COLORS } from "./energyColors";

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
}

export type HourlyProfileView =
  | { kind: "nothing-yet" }
  | {
      kind: "profile";
      /** The month the profile covers, as the response states it: "agosto de 2026". */
      month: string;
      hours: HourView[];
      categories: string[];
      series: { name: string; data: (number | null)[] }[];
      colors: string[];
      annotations: ApexOptions["annotations"];
    };

export const CONSUMPTION_SERIES = "Tu consumo";
export const PRODUCTION_SERIES = "Energía asignada";
export const NO_SAMPLE_TEXT = "Sin registros";

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

function hourOf(bucket: MembershipHourlyProfileBucketResponse): HourView {
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
 * which hours are gaps and which are measured zeros, series by series, and the
 * words for each. The chart and its table both render this view and compute
 * nothing of their own, so the table proves what the chart is told to draw.
 */
export function toHourlyProfileView(response: MembershipHourlyProfileResponse): HourlyProfileView {
  const hours = response.buckets.map(hourOf);
  const anySample = hours.some((hour) => hour.consumption.kind === "average" || hour.production.kind === "average");
  if (!response.period.startDate || !anySample) return { kind: "nothing-yet" };

  return {
    kind: "profile",
    month: formatMonth(response.period.startDate),
    hours,
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
