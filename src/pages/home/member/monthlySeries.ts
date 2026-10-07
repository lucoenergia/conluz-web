import type { ApexOptions } from "apexcharts";
import type { MembershipMonthlyConsumptionBucketResponse } from "../../../api/models";
import {
  formatCalendarMonth,
  formatEuros,
  formatKilowattHours,
  formatShortMonth,
} from "../../../utils/formatEnergyFigures";
import { colors } from "../../../theme/tokens";

/** What a month in the series stands for. */
export type MonthState =
  /** No supply stored a record: there is no figure, and none may be drawn as zero. */
  | { kind: "nothing-stored" }
  /** At least one supply stored a record: every figure is a measurement, zero included. */
  | { kind: "stored"; incomplete: { reported: number; total: number } | null };

export interface MonthView {
  /** The month's local calendar date, as the response gives it. */
  date: string;
  /** The chart's category: "ago". Unique across twelve consecutive months. */
  label: string;
  /** "agosto de 2026". */
  name: string;
  state: MonthState;
  /** What the chart plots: null is a gap, never a zero. */
  selfConsumptionKWh: number | null;
  gridImportKWh: number | null;
  savingsEur: number | null;
  /** The same figures in words, for the tooltip and the table. */
  selfConsumptionText: string;
  gridImportText: string;
  savingsText: string;
  /** The incomplete marker in words, or null when the month is complete or has nothing stored. */
  incompleteText: string | null;
}

export interface MonthlySeriesView {
  months: MonthView[];
  /** The chart's categories, one per month in order. */
  categories: string[];
  /** How many of the months have anything stored: a count of slots, not a figure added up. */
  monthsWithData: number;
  /** Whether any stored month is missing supplies, so the caption explains the marker. */
  hasIncompleteMonth: boolean;
  energySeries: { name: string; data: (number | null)[] }[];
  savingsSeries: { name: string; data: (number | null)[] }[];
  energyAnnotations: ApexOptions["annotations"];
  savingsAnnotations: ApexOptions["annotations"];
}

export const SELF_CONSUMPTION_SERIES = "De la comunidad";
export const GRID_IMPORT_SERIES = "De la red";
export const SAVINGS_SERIES = "Ahorro";
export const NOTHING_STORED_TEXT = "Sin datos";

/**
 * A month with nothing stored is told apart from a measured zero by
 * `savingsEur` alone: the contract makes it null exactly when no supply stored
 * a record, while its energy fields read 0 either way. So the energy is drawn
 * as a gap on that month too -- its 0 there is a placeholder, not a reading.
 */
function monthOf(bucket: MembershipMonthlyConsumptionBucketResponse): MonthView {
  const base = { date: bucket.date, label: formatShortMonth(bucket.date), name: formatCalendarMonth(bucket.date) };
  if (bucket.savingsEur === null) {
    return {
      ...base,
      state: { kind: "nothing-stored" },
      selfConsumptionKWh: null,
      gridImportKWh: null,
      savingsEur: null,
      selfConsumptionText: NOTHING_STORED_TEXT,
      gridImportText: NOTHING_STORED_TEXT,
      savingsText: NOTHING_STORED_TEXT,
      incompleteText: null,
    };
  }
  const incomplete =
    bucket.suppliesWithData < bucket.supplyCount
      ? { reported: bucket.suppliesWithData, total: bucket.supplyCount }
      : null;
  return {
    ...base,
    state: { kind: "stored", incomplete },
    selfConsumptionKWh: bucket.selfConsumptionEnergyKWh,
    gridImportKWh: bucket.consumptionKWh,
    savingsEur: bucket.savingsEur,
    selfConsumptionText: formatKilowattHours(bucket.selfConsumptionEnergyKWh),
    gridImportText: formatKilowattHours(bucket.consumptionKWh),
    savingsText: formatEuros(bucket.savingsEur),
    incompleteText: incomplete ? `Incompleto: ${incomplete.reported} de ${incomplete.total} suministros` : null,
  };
}

type Annotations = NonNullable<ApexOptions["annotations"]>;
type XAxisAnnotation = NonNullable<Annotations["xaxis"]>[number];
type PointAnnotation = NonNullable<Annotations["points"]>[number];

const annotationLabelStyle = { color: colors.text.body, background: colors.background.paper, fontSize: "11px" };

/** A dashed line through a month with nothing stored, saying so on the chart itself. */
function nothingStoredAnnotation(month: MonthView): XAxisAnnotation {
  return {
    x: month.label,
    borderColor: colors.text.muted,
    strokeDashArray: 2,
    label: { text: NOTHING_STORED_TEXT, borderColor: colors.border.light, style: annotationLabelStyle },
  };
}

/** A marker on the baseline: the month was measured, and the figure is zero. */
function measuredZeroAnnotation(month: MonthView): PointAnnotation {
  return {
    x: month.label,
    y: 0,
    marker: { size: 5, fillColor: colors.text.primary, strokeColor: colors.background.paper, strokeWidth: 2 },
    label: { text: "0", borderColor: colors.border.light, offsetY: 0, style: annotationLabelStyle },
  };
}

/** A dashed outline naming how many supplies reported, so a lower bar is not read as lower usage. */
function incompleteAnnotation(month: MonthView, incomplete: { reported: number; total: number }): XAxisAnnotation {
  return {
    x: month.label,
    borderColor: colors.text.muted,
    strokeDashArray: 6,
    label: {
      text: `${incomplete.reported} de ${incomplete.total}`,
      orientation: "horizontal",
      borderColor: colors.text.muted,
      style: annotationLabelStyle,
    },
  };
}

function annotationsFor(months: MonthView[], isMeasuredZero: (month: MonthView) => boolean): ApexOptions["annotations"] {
  return {
    xaxis: months.flatMap((month) => {
      if (month.state.kind === "nothing-stored") return [nothingStoredAnnotation(month)];
      return month.state.incomplete ? [incompleteAnnotation(month, month.state.incomplete)] : [];
    }),
    points: months.filter(isMeasuredZero).map(measuredZeroAnnotation),
  };
}

/**
 * The twelve-month series (#201), every decision about what is drawn made
 * here: which months are gaps, which are measured zeros, which are incomplete,
 * and the words for each. The chart and its table both render this view and
 * compute nothing of their own, so the table proves what the chart is told to
 * draw.
 *
 * Every figure is the response's own: no month is recomputed and no total is
 * added up.
 */
export function toMonthlySeriesView(buckets: MembershipMonthlyConsumptionBucketResponse[]): MonthlySeriesView {
  const months = buckets.map(monthOf);
  return {
    months,
    categories: months.map((month) => month.label),
    monthsWithData: months.filter((month) => month.state.kind === "stored").length,
    hasIncompleteMonth: months.some((month) => month.incompleteText !== null),
    energySeries: [
      { name: SELF_CONSUMPTION_SERIES, data: months.map((month) => month.selfConsumptionKWh) },
      { name: GRID_IMPORT_SERIES, data: months.map((month) => month.gridImportKWh) },
    ],
    savingsSeries: [{ name: SAVINGS_SERIES, data: months.map((month) => month.savingsEur) }],
    energyAnnotations: annotationsFor(months, (month) => month.selfConsumptionKWh === 0 && month.gridImportKWh === 0),
    savingsAnnotations: annotationsFor(months, (month) => month.savingsEur === 0),
  };
}
