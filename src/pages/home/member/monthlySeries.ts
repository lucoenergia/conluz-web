import type { ApexOptions } from "apexcharts";
import type { MembershipMonthlyConsumptionBucketResponse } from "../../../api/models";
import {
  formatCalendarMonth,
  formatEuros,
  formatKilowattHours,
  formatShortMonth,
} from "../../../utils/formatEnergyFigures";
import { colors } from "../../../theme/tokens";
import { ENERGY_COLORS, SAVINGS_COLOR } from "../../../components/EnergyFigures/energyColors";
import type { RowSlot } from "../../../components/evolution/EvolutionRows";
import type { SlotDetail } from "../../../components/evolution/evolutionChartOptions";
import { scaleEnd, type SegmentDefinition, type SlotState } from "../../../components/evolution/evolutionSeries";

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

/** The segments of a month's energy bar, below sm: community energy stacked with grid energy. */
export type MonthSegment = "community" | "grid";

/** A month as a row, below sm (UI-CHT-001), with the month it was read from. */
export interface MonthRow extends RowSlot<MonthSegment> {
  month: MonthView;
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
  /** Below sm, the same months as rows (UI-CHT-001), each list on one scale. */
  rows: { slots: MonthRow[]; energyScale: number; savingsScale: number };
}

export const SELF_CONSUMPTION_SERIES = "De la comunidad";
export const GRID_IMPORT_SERIES = "De la red";
export const SAVINGS_SERIES = "Ahorro";
export const NOTHING_STORED_TEXT = "Sin datos";
/** Below sm, the names of the rows' lists. */
export const ENERGY_ROWS_LABEL = "Tu energía por mes";
export const SAVINGS_ROWS_LABEL = "Tu ahorro por mes";

/** The energy rows' segments, in the twelve-month chart's colours and order. */
export const MONTH_SEGMENTS: readonly SegmentDefinition<MonthSegment>[] = [
  { key: "community", label: SELF_CONSUMPTION_SERIES, color: ENERGY_COLORS.community, group: "energy" },
  { key: "grid", label: GRID_IMPORT_SERIES, color: ENERGY_COLORS.grid, group: "energy" },
];

/** The incomplete marker as the chart draws it: "1 de 2". The caption explains it in these words. */
export const incompleteMarkText = ({ reported, total }: { reported: number; total: number }) => `${reported} de ${total}`;

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
    selfConsumptionKWh: bucket.selfConsumptionKWh,
    gridImportKWh: bucket.gridImportKWh,
    savingsEur: bucket.savingsEur,
    selfConsumptionText: formatKilowattHours(bucket.selfConsumptionKWh),
    gridImportText: formatKilowattHours(bucket.gridImportKWh),
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
      text: incompleteMarkText(incomplete),
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

const isMeasuredZeroEnergy = (month: MonthView) => month.selfConsumptionKWh === 0 && month.gridImportKWh === 0;

function rowStateOf(month: MonthView): SlotState {
  if (month.state.kind === "nothing-stored") return { kind: "gap" };
  if (month.state.incomplete) return { kind: "partial", ...month.state.incomplete };
  return isMeasuredZeroEnergy(month) ? { kind: "measuredZero" } : { kind: "complete" };
}

/**
 * A month as a row. `total`, community and grid energy added up, is the
 * length of the stacked bar: geometry, never shown, as the chart's stacked
 * column is. The figure a row shows is the response's own community energy.
 */
function rowOf(month: MonthView): MonthRow {
  const gap = month.state.kind === "nothing-stored";
  return {
    month,
    key: month.date,
    name: month.name,
    rowLabel: month.label,
    startsMonthOrYear: false,
    endsWeek: false,
    state: rowStateOf(month),
    values: { community: month.selfConsumptionKWh, grid: month.gridImportKWh },
    total: gap ? null : (month.selfConsumptionKWh ?? 0) + (month.gridImportKWh ?? 0),
    savingsEur: month.savingsEur,
    savingsZero: month.savingsEur === 0,
  };
}

/** A month's energy row name: its community energy, the figure the row shows, and its incomplete marker. */
export function monthEnergyRowName({ month }: MonthRow): string {
  if (month.state.kind === "nothing-stored") return `${month.name}: ${NOTHING_STORED_TEXT.toLowerCase()}`;
  const named = `${month.name}: ${SELF_CONSUMPTION_SERIES} ${month.selfConsumptionText}`;
  return month.incompleteText ? `${named}, ${month.incompleteText}` : named;
}

/** A month's savings row name: its amount and its incomplete marker. */
export function monthSavingsRowName({ month }: MonthRow): string {
  if (month.state.kind === "nothing-stored") return `${month.name}: ${NOTHING_STORED_TEXT.toLowerCase()}`;
  const named = `${month.name}: ${month.savingsText}`;
  return month.incompleteText ? `${named}, ${month.incompleteText}` : named;
}

/** What an open month row says beneath it: what the chart's tooltip says. */
export function monthDetail({ month }: MonthRow): SlotDetail {
  return {
    title: month.name,
    lines: month.incompleteText ? [month.incompleteText] : [],
    figures: [
      { term: SELF_CONSUMPTION_SERIES, swatch: ENERGY_COLORS.community, value: month.selfConsumptionText },
      { term: GRID_IMPORT_SERIES, swatch: ENERGY_COLORS.grid, value: month.gridImportText },
      { term: SAVINGS_SERIES, swatch: SAVINGS_COLOR, value: month.savingsText },
    ],
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
 * shown. Below sm, a row's bar is as long as its community and grid energy
 * added up, as the chart's stacked column is: geometry, never a figure.
 */
export function toMonthlySeriesView(buckets: MembershipMonthlyConsumptionBucketResponse[]): MonthlySeriesView {
  const months = buckets.map(monthOf);
  const slots = months.map(rowOf);
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
    energyAnnotations: annotationsFor(months, isMeasuredZeroEnergy),
    savingsAnnotations: annotationsFor(months, (month) => month.savingsEur === 0),
    rows: {
      slots,
      energyScale: scaleEnd(Math.max(0, ...slots.map((slot) => slot.total ?? 0))),
      savingsScale: scaleEnd(Math.max(0, ...slots.map((slot) => slot.savingsEur ?? 0))),
    },
  };
}
