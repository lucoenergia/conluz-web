import type { ApexOptions } from "apexcharts";
import type { SupplyConsumptionBucketResponse } from "../../api/models";
import {
  formatCalendarDay,
  formatCalendarMonth,
  formatEuros,
  formatKilowattHours,
  formatShortDay,
  formatShortMonth,
} from "../../utils/formatEnergyFigures";
import { colors } from "../../theme/tokens";
import {
  addDays,
  addMonths,
  calendarDayOf,
  compareDays,
  dayName,
  dayRangePhrase,
  formatDayKey,
  monthRangePhrase,
  monthYearName,
  type CalendarDay,
  type Granularity,
  type HistoricalPeriod,
} from "./historicalPeriod";
import { slotStateText } from "./slotStateText";
import type { ConsumptionSeries } from "./usePeriodConsumptionSeries";

/**
 * What a slot of the axis stands for. When several signals coincide, the
 * first that applies decides: gap > partial > measuredZero > complete.
 */
export type SlotState =
  /** Nothing stored: no figure exists, and none may be drawn as 0. */
  | { kind: "gap" }
  /** Some of the member's supplies stored nothing: the figures add up only those that did. */
  | { kind: "partial"; reported: number; total: number }
  /** Stored, and every energy figure measured 0. */
  | { kind: "measuredZero" }
  | { kind: "complete" };

export interface SlotView {
  /** The slot's first day, written as a bucket's `date`: "2026/07/01". The chart's category. */
  key: string;
  day: CalendarDay;
  /** The x-axis label, or "" where the axis is thinned so labels never overlap. */
  axisLabel: string;
  /** "15 de julio de 2026", "Febrero de 2026": the tooltip's header. */
  name: string;
  /** Below sm, the row's label, on every slot: "1 ago", "sept 25". */
  rowLabel: string;
  /** The 1st of a month on a daily axis, or January on a monthly one: the row label is set apart. */
  startsMonthOrYear: boolean;
  /** A daily row that closes a week of the axis: a separator follows it. */
  endsWeek: boolean;
  state: SlotState;
  /** What the charts plot: null on a gap, never 0. */
  selfConsumptionKWh: number | null;
  gridImportKWh: number | null;
  surplusKWh: number | null;
  savingsEur: number | null;
  /**
   * Below sm, the row's consumption figure: community energy plus grid energy,
   * the bar the chart draws, since a bucket carries no total (UI-HIS-025).
   * Null on a gap.
   */
  consumptionKWh: number | null;
  /** The state in words, the tooltip's status line. */
  stateText: string;
  /** The figures in words, for the tooltip; null on a gap, which has none. */
  selfConsumptionText: string | null;
  gridImportText: string | null;
  surplusText: string | null;
  savingsText: string | null;
}

export interface ChartSeries {
  name: string;
  /** Series sharing a group stack into one bar; different groups stand side by side. */
  group: string;
  data: (number | null)[];
}

export interface ConsumptionSeriesView {
  granularity: Granularity;
  slots: SlotView[];
  categories: string[];
  energySeries: ChartSeries[];
  savingsSeries: ChartSeries[];
  energyAnnotations: ApexOptions["annotations"];
  savingsAnnotations: ApexOptions["annotations"];
  /** "Julio de 2026: 29 de 31 días con datos; faltan 2." */
  coverageText: string;
  /** One date range per run of consecutive gaps, or null without gaps. */
  gapsNotice: string | null;
  /** Membership only: which slots miss supplies, or null when none does. */
  partialNotice: string | null;
  /** Wide enough that every slot keeps its width: a narrower screen scrolls the chart. */
  minChartWidth: number;
  /** Below sm, where each chart's scale ends: a round figure at or above its longest bar (UI-HIS-025). */
  rowScale: { energyKWh: number; savingsEur: number };
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
const SAVINGS_GROUP = "savings";

export { COMPLETE_TEXT } from "./slotStateText";
export const MEASURED_ZERO_KWH_TEXT = "0,0 kWh (medido)";
export const MEASURED_ZERO_EUR_TEXT = `${formatEuros(0)} (medido)`;

/** Each slot at least this wide, in px: a day's pair of bars stays readable. */
const SLOT_WIDTH = { daily: 20, monthly: 48 } as const;
/** The room one axis label needs, its gap to the next included, in px: "15 sept", "ene 26". */
const LABEL_WIDTH = 46;

const UNIT = {
  daily: { one: "día", many: "días" },
  monthly: { one: "mes", many: "meses" },
} as const;

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The smallest of 1, 2, 2.5 and 5 times a power of ten at or above `value`,
 * so a scale ends on a figure that reads at a glance; 1 when nothing is drawn.
 */
export function scaleEnd(value: number): number {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= value * (1 - 1e-9))!;
  return step * power;
}

/**
 * The slots of a period: every calendar day for a daily period, every month
 * for a monthly one, from the period's own bounds in the app's time zone.
 * Half-open: the day or month `endDate` starts is not part of it. Counted in
 * calendar days, so a daylight-saving change adds or loses no slot.
 */
export function axisOf(period: HistoricalPeriod): CalendarDay[] {
  const first = calendarDayOf(period.startDate);
  const end = calendarDayOf(period.endDate);
  const slots: CalendarDay[] = [];
  if (period.granularity === "daily") {
    for (let day = first; compareDays(day, end) < 0; day = addDays(day, 1)) slots.push(day);
    return slots;
  }
  for (let month = { year: first.year, month: first.month }; compareDays({ ...month, day: 1 }, end) < 0; month = addMonths(month, 1)) {
    slots.push({ ...month, day: 1 });
  }
  return slots;
}

/** One series' bucket reduced to what decides a slot. */
interface BucketReading {
  /** No record stored. */
  isGap: boolean;
  partial: { reported: number; total: number } | null;
  selfConsumptionKWh: number;
  gridImportKWh: number;
  surplusKWh: number;
  savingsEur: number;
}

/**
 * How each series marks its states (#250):
 * - membership: a gap is `savingsEur: null`; partial is `suppliesWithData < supplyCount`;
 * - supply: a gap is `obtainMethod: null`, whose zeros are placeholders, not readings.
 */
function readingsOf(series: ConsumptionSeries): Map<string, BucketReading> {
  if (series.kind === "membershipDaily" || series.kind === "membershipMonthly") {
    return new Map(
      series.buckets.map((bucket) => [
        bucket.date,
        {
          isGap: bucket.savingsEur === null,
          partial: bucket.suppliesWithData < bucket.supplyCount ? { reported: bucket.suppliesWithData, total: bucket.supplyCount } : null,
          selfConsumptionKWh: bucket.selfConsumptionKWh,
          gridImportKWh: bucket.gridImportKWh,
          surplusKWh: bucket.surplusKWh,
          savingsEur: bucket.savingsEur ?? 0,
        },
      ]),
    );
  }
  return new Map(series.buckets.map((bucket: SupplyConsumptionBucketResponse) => [bucket.date, supplyReading(bucket)]));
}

function supplyReading(bucket: SupplyConsumptionBucketResponse): BucketReading {
  return {
    isGap: bucket.obtainMethod === null,
    partial: null,
    selfConsumptionKWh: bucket.selfConsumptionKWh,
    gridImportKWh: bucket.gridImportKWh,
    surplusKWh: bucket.surplusKWh,
    savingsEur: bucket.savingsEur,
  };
}

/** gap > partial > measuredZero > complete. A slot the series omits is a gap. */
function stateOf(reading: BucketReading | undefined): SlotState {
  if (!reading || reading.isGap) return { kind: "gap" };
  if (reading.partial) return { kind: "partial", ...reading.partial };
  if (reading.selfConsumptionKWh === 0 && reading.gridImportKWh === 0 && reading.surplusKWh === 0) return { kind: "measuredZero" };
  return { kind: "complete" };
}

const kilowattHoursText = (value: number) => (value === 0 ? MEASURED_ZERO_KWH_TEXT : formatKilowattHours(value));
const eurosText = (value: number) => (value === 0 ? MEASURED_ZERO_EUR_TEXT : formatEuros(value));

function axisLabelOf(day: CalendarDay, index: number, granularity: Granularity, step: number): string {
  if (index % step !== 0) return "";
  const key = formatDayKey(day);
  if (granularity === "daily") return formatShortDay(key);
  // The year where it changes, and on the first month, so 24 months read unambiguously.
  return index === 0 || day.month === 1 ? `${formatShortMonth(key)} ${String(day.year).slice(2)}` : formatShortMonth(key);
}

function rowLabelOf(day: CalendarDay, granularity: Granularity): string {
  const key = formatDayKey(day);
  return granularity === "daily" ? formatShortDay(key) : `${formatShortMonth(key)} ${String(day.year).slice(2)}`;
}

function slotOf(day: CalendarDay, index: number, reading: BucketReading | undefined, granularity: Granularity, step: number): SlotView {
  const key = formatDayKey(day);
  const state = stateOf(reading);
  const base = {
    key,
    day,
    axisLabel: axisLabelOf(day, index, granularity, step),
    name: granularity === "daily" ? formatCalendarDay(key) : capitalise(formatCalendarMonth(key)),
    rowLabel: rowLabelOf(day, granularity),
    startsMonthOrYear: granularity === "daily" ? day.day === 1 : day.month === 1,
    endsWeek: granularity === "daily" && (index + 1) % 7 === 0,
    state,
    stateText: slotStateText(state, granularity).long,
  };
  if (state.kind === "gap" || !reading) {
    return {
      ...base,
      selfConsumptionKWh: null,
      gridImportKWh: null,
      surplusKWh: null,
      savingsEur: null,
      consumptionKWh: null,
      selfConsumptionText: null,
      gridImportText: null,
      surplusText: null,
      savingsText: null,
    };
  }
  return {
    ...base,
    selfConsumptionKWh: reading.selfConsumptionKWh,
    gridImportKWh: reading.gridImportKWh,
    surplusKWh: reading.surplusKWh,
    savingsEur: reading.savingsEur,
    consumptionKWh: reading.selfConsumptionKWh + reading.gridImportKWh,
    selfConsumptionText: kilowattHoursText(reading.selfConsumptionKWh),
    gridImportText: kilowattHoursText(reading.gridImportKWh),
    surplusText: kilowattHoursText(reading.surplusKWh),
    savingsText: eurosText(reading.savingsEur),
  };
}

// ─── Markers ─────────────────────────────────────────────────────────────────

type Annotations = NonNullable<ApexOptions["annotations"]>;
type PointAnnotation = NonNullable<Annotations["points"]>[number];

/** A hollow ring on the baseline: nothing was stored. */
function gapMarker(slot: SlotView): PointAnnotation {
  return { x: slot.key, y: 0, marker: { size: 5, fillColor: colors.background.paper, strokeColor: colors.text.muted, strokeWidth: 2 } };
}

/** A solid dot on the baseline: measured, and zero. */
function zeroMarker(slot: SlotView): PointAnnotation {
  return { x: slot.key, y: 0, marker: { size: 4, fillColor: colors.text.primary, strokeColor: colors.text.primary, strokeWidth: 0 } };
}

/** An asterisk above the bar: some supplies are missing from it. */
function partialMarker(slot: SlotView, top: number): PointAnnotation {
  return {
    x: slot.key,
    y: top,
    marker: { size: 0 },
    label: {
      text: "*",
      borderWidth: 0,
      offsetY: 4,
      style: { color: colors.text.primary, background: "transparent", fontSize: "14px", fontWeight: 700 },
    },
  };
}

/**
 * The markers of one chart, every one of them put in words by the tooltip and
 * the key under the charts. `top` is where a partial slot's bar ends: bar
 * geometry, never a figure shown.
 */
function annotationsFor(slots: SlotView[], isZero: (slot: SlotView) => boolean, top: (slot: SlotView) => number): ApexOptions["annotations"] {
  return {
    points: slots.flatMap((slot) => {
      if (slot.state.kind === "gap") return [gapMarker(slot)];
      const marks: PointAnnotation[] = [];
      if (isZero(slot)) marks.push(zeroMarker(slot));
      if (slot.state.kind === "partial") marks.push(partialMarker(slot, top(slot)));
      return marks;
    }),
  };
}

// ─── Words about the whole period ────────────────────────────────────────────

/** Consecutive slots that satisfy `belongs`, as [first, last] pairs. */
function runsOf(slots: SlotView[], belongs: (slot: SlotView) => boolean): [SlotView, SlotView][] {
  const runs: [SlotView, SlotView][] = [];
  let start: SlotView | null = null;
  slots.forEach((slot, index) => {
    if (belongs(slot) && start === null) start = slot;
    const next = slots[index + 1];
    if (start !== null && (!next || !belongs(next))) {
      runs.push([start, slot]);
      start = null;
    }
  });
  return runs;
}

const joinPhrases = (phrases: string[]) =>
  phrases.length <= 1 ? (phrases[0] ?? "") : `${phrases.slice(0, -1).join(", ")} y ${phrases[phrases.length - 1]}`;

/** "del 14 al 16 de julio de 2026", "de febrero a marzo de 2026", "de julio de 2026". */
function gapRangePhrase([first, last]: [SlotView, SlotView], granularity: Granularity): string {
  if (granularity === "daily") return compareDays(first.day, last.day) === 0 ? `del ${dayName(first.day)}` : `del ${dayRangePhrase(first.day, last.day)}`;
  return compareDays(first.day, last.day) === 0 ? `de ${monthYearName(first.day)}` : `de ${monthRangePhrase(first.day, last.day)}`;
}

/** "el 3 de julio de 2026", "los días del 14 al 16 de julio de 2026", "julio de 2026", "los meses de febrero a marzo de 2026". */
function partialRangePhrase([first, last]: [SlotView, SlotView], granularity: Granularity): string {
  const single = compareDays(first.day, last.day) === 0;
  if (granularity === "daily") return single ? `el ${dayName(first.day)}` : `los días del ${dayRangePhrase(first.day, last.day)}`;
  return single ? monthYearName(first.day) : `los meses de ${monthRangePhrase(first.day, last.day)}`;
}

function gapsNoticeOf(slots: SlotView[], granularity: Granularity): string | null {
  const runs = runsOf(slots, (slot) => slot.state.kind === "gap");
  if (runs.length === 0) return null;
  const ranges = joinPhrases(runs.map((run) => gapRangePhrase(run, granularity)));
  return `Faltan datos ${ranges}. Los totales suman solo los ${UNIT[granularity].many} con datos.`;
}

/** One sentence per count of reporting supplies, so each names its own "{n} de tus {total}". */
function partialNoticeOf(slots: SlotView[], granularity: Granularity): string | null {
  const counts = new Map<string, { reported: number; total: number }>();
  for (const slot of slots) if (slot.state.kind === "partial") counts.set(`${slot.state.reported}/${slot.state.total}`, slot.state);
  if (counts.size === 0) return null;
  return [...counts.entries()]
    .map(([id, { reported, total }]) => {
      const isThisCount = (slot: SlotView) => slot.state.kind === "partial" && `${slot.state.reported}/${slot.state.total}` === id;
      const runs = runsOf(slots, isThisCount);
      const several = slots.filter(isThisCount).length > 1;
      const unit = UNIT[granularity];
      const marked = several
        ? `Esos ${unit.many} se marcan como parciales.`
        : `${granularity === "daily" ? "Ese día" : "Ese mes"} se marca como parcial.`;
      const where = joinPhrases(runs.map((run) => partialRangePhrase(run, granularity)));
      return `En ${where} solo hay datos de ${reported} de tus ${total} puntos. ${marked}`;
    })
    .join(" ");
}

function coverageTextOf(slots: SlotView[], period: HistoricalPeriod): string {
  const unit = UNIT[period.granularity];
  const withData = slots.filter((slot) => slot.state.kind !== "gap").length;
  const gaps = slots.length - withData;
  const partial = slots.filter((slot) => slot.state.kind === "partial").length;
  const counted = `${period.label}: ${withData} de ${slots.length} ${slots.length === 1 ? unit.one : unit.many} con datos`;
  if (gaps > 0) return `${counted}; ${gaps === 1 ? "falta" : "faltan"} ${gaps}.`;
  if (partial > 0) return `${counted}; ${partial} con datos parciales.`;
  return `${counted}.`;
}

/**
 * The evolution charts of the period (#250), every decision about what is
 * drawn made here: the axis, which slot is a gap, a partial or a measured
 * zero, and the words for each. The charts render this view and compute
 * nothing of their own.
 *
 * The axis comes from the period, not from the buckets: a slot the series
 * omits (the supply monthly series leaves out a month with nothing stored) is
 * still on it, as a gap. Buckets are matched to slots by their `date` string,
 * never parsed as an instant.
 *
 * Every figure is a bucket's own, but one: below sm, a row states the slot's
 * consumption, its community energy plus its grid energy, which no bucket
 * carries (UI-HIS-025). What the client also counts is slots by state (the
 * coverage line, the notices), where a partial slot's bar ends, to place its
 * marker, and where each row scale ends.
 *
 * A slot's state follows the first signal that applies:
 * gap > partial > measuredZero > complete. A day no supply reported is a gap
 * even if the series wrote zeros or other values for it; a partial day whose
 * figures are all zero is partial, since the zeros cover only part of the
 * member's supplies.
 */
export function toConsumptionSeriesView(period: HistoricalPeriod, series: ConsumptionSeries): ConsumptionSeriesView {
  const { granularity } = period;
  const readings = readingsOf(series);
  const step = Math.max(1, Math.ceil(LABEL_WIDTH / SLOT_WIDTH[granularity]));
  const slots = axisOf(period).map((day, index) => slotOf(day, index, readings.get(formatDayKey(day)), granularity, step));
  const isMembership = series.kind === "membershipDaily" || series.kind === "membershipMonthly";

  return {
    granularity,
    slots,
    categories: slots.map((slot) => slot.key),
    energySeries: [
      { name: SELF_CONSUMPTION_SERIES, group: CONSUMPTION_GROUP, data: slots.map((slot) => slot.selfConsumptionKWh) },
      { name: GRID_IMPORT_SERIES, group: CONSUMPTION_GROUP, data: slots.map((slot) => slot.gridImportKWh) },
      { name: SURPLUS_SERIES, group: ASSIGNED_UNUSED_GROUP, data: slots.map((slot) => slot.surplusKWh) },
    ],
    savingsSeries: [{ name: SAVINGS_SERIES, group: SAVINGS_GROUP, data: slots.map((slot) => slot.savingsEur) }],
    energyAnnotations: annotationsFor(
      slots,
      (slot) => slot.state.kind === "measuredZero",
      (slot) => (slot.selfConsumptionKWh ?? 0) + (slot.gridImportKWh ?? 0),
    ),
    savingsAnnotations: annotationsFor(
      slots,
      (slot) => slot.savingsEur === 0,
      (slot) => slot.savingsEur ?? 0,
    ),
    coverageText: coverageTextOf(slots, period),
    gapsNotice: gapsNoticeOf(slots, granularity),
    partialNotice: isMembership ? partialNoticeOf(slots, granularity) : null,
    minChartWidth: slots.length * SLOT_WIDTH[granularity],
    // One scale per chart: the energy rows' two bars share it (UI-HIS-025).
    rowScale: {
      energyKWh: scaleEnd(Math.max(0, ...slots.map((slot) => Math.max(slot.consumptionKWh ?? 0, slot.surplusKWh ?? 0)))),
      savingsEur: scaleEnd(Math.max(0, ...slots.map((slot) => slot.savingsEur ?? 0))),
    },
  };
}
