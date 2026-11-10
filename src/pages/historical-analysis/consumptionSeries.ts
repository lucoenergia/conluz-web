import type { ApexOptions } from "apexcharts";
import type { MembershipHourlyConsumptionBucketResponse, SupplyConsumptionBucketResponse } from "../../api/models";
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
import { localIsoAt, wallTimeAt } from "../../utils/zonedTime";
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

/** The hour an hourly slot stands for (#378). */
export interface SlotHour {
  /** The instant it starts at, in the app's time zone with its offset: "2026-10-25T02:00:00+01:00". */
  startsAt: string;
  /** The hour the clock shows when it starts, 0-23. */
  clockHour: number;
  /** The clock shows this hour twice that day: the October change. */
  repeated: boolean;
}

export interface SlotView {
  /**
   * The chart's category, unique on the axis. A day or a month: its first day
   * written as a bucket's `date`, "2026/07/01". An hour: its `startsAt`.
   */
  key: string;
  day: CalendarDay;
  /** An hourly slot's hour; null on a day or a month. */
  hour: SlotHour | null;
  /** The x-axis label, or "" where the axis is thinned so labels never overlap. */
  axisLabel: string;
  /** "15 de julio de 2026", "Febrero de 2026", "De 14:00 a 15:00": the tooltip's header. */
  name: string;
  /** The data table's row label: the tooltip's name, or for an hour "14:00–15:00". */
  tableLabel: string;
  /** Below sm, the row's label, on every slot: "1 ago", "sept 25", "14 h". */
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
/** Both hours the clock shows twice on the October change day carry it. */
export const REPEATED_HOUR_NOTE = "(hora repetida por el cambio de hora)";
export const MEASURED_ZERO_KWH_TEXT = "0,0 kWh (medido)";
export const MEASURED_ZERO_EUR_TEXT = `${formatEuros(0)} (medido)`;

/** Each slot at least this wide, in px: a day's pair of bars stays readable. */
const SLOT_WIDTH = { hourly: 20, daily: 20, monthly: 48 } as const;
/** The room one axis label needs, its gap to the next included, in px: "15 sept", "ene 26", "23 h". */
const LABEL_WIDTH = { hourly: 34, daily: 46, monthly: 46 } as const;

/** A slot's noun, and the words that agree with it: "hora" is feminine. */
const UNIT = {
  hourly: { one: "hora", many: "horas", the: "las", thatOne: "Esa", those: "Esas" },
  daily: { one: "día", many: "días", the: "los", thatOne: "Ese", those: "Esos" },
  monthly: { one: "mes", many: "meses", the: "los", thatOne: "Ese", those: "Esos" },
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

/** A slot of the axis before it meets the buckets: the key buckets are matched by, its calendar day, and its hour if it is one. */
interface AxisSlot {
  key: string;
  day: CalendarDay;
  hour: SlotHour | null;
}

const MS_PER_HOUR = 3_600_000;

/**
 * The hours of an hourly period (#378): every whole hour that starts inside
 * it, stepped on the instant line from `startDate` up to `endDate`, which is
 * excluded -- 23, 24 or 25 for a day, as the backend emits them (SCS-001,
 * MCS-003). Each is keyed by its instant written in the app's time zone,
 * which stays unique on the day the clocks go back, and read on the clock
 * there: never in the device's zone.
 */
export function hourAxisOf(period: HistoricalPeriod): AxisSlot[] {
  const starts: number[] = [];
  for (let instant = Date.parse(period.startDate); instant < Date.parse(period.endDate); instant += MS_PER_HOUR) starts.push(instant);
  const walls = starts.map((instant) => wallTimeAt(instant));
  // Counting the clock's hours is how the repeated one is found: no figure.
  const timesShown = new Map<number, number>();
  for (const wall of walls) timesShown.set(wall.hour, (timesShown.get(wall.hour) ?? 0) + 1);
  return starts.map((instant, index) => {
    const { year, month, day, hour } = walls[index];
    const startsAt = localIsoAt(instant);
    return { key: startsAt, day: { year, month, day }, hour: { startsAt, clockHour: hour, repeated: timesShown.get(hour)! > 1 } };
  });
}

/** The axis of a period. A day or a month is keyed as its bucket is, by `date`; an hour by its instant. */
function axisSlotsOf(period: HistoricalPeriod): AxisSlot[] {
  if (period.granularity === "hourly") return hourAxisOf(period);
  return axisOf(period).map((day) => ({ key: formatDayKey(day), day, hour: null }));
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
 * How each series marks its states (#250, #378):
 * - membership: a gap is `savingsEur: null`; partial is `suppliesWithData < supplyCount`;
 * - supply: a gap is `obtainMethod: null`, whose zeros and 0.00 € are placeholders, not readings.
 *
 * A day or a month is keyed by its `date` string, never parsed as an
 * instant. An hour is keyed by its `startsAt` instant, never by `date` and
 * `time`, which two hours share on the day the clocks go back.
 */
function readingsOf(series: ConsumptionSeries): Map<string, BucketReading> {
  switch (series.kind) {
    case "membershipHourly":
      return new Map(series.buckets.flatMap((bucket) => hourEntry(bucket, membershipReading(bucket))));
    case "membershipDaily":
    case "membershipMonthly":
      return new Map(series.buckets.map((bucket) => [bucket.date, membershipReading(bucket)]));
    case "supplyHourly":
      return new Map(series.buckets.flatMap((bucket) => hourEntry(bucket, supplyReading(bucket))));
    case "supplyDaily":
    case "supplyMonthly":
      return new Map(series.buckets.map((bucket) => [bucket.date, supplyReading(bucket)]));
  }
}

/** An hourly bucket under the key of the hour it starts: its instant, as the axis writes it. One that names no instant matches no hour. */
function hourEntry(bucket: { startsAt: string }, reading: BucketReading): [string, BucketReading][] {
  const instant = Date.parse(bucket.startsAt);
  return Number.isNaN(instant) ? [] : [[localIsoAt(instant), reading]];
}

type MembershipBucket = Pick<
  MembershipHourlyConsumptionBucketResponse,
  "savingsEur" | "suppliesWithData" | "supplyCount" | "selfConsumptionKWh" | "gridImportKWh" | "surplusKWh"
>;

function membershipReading(bucket: MembershipBucket): BucketReading {
  return {
    isGap: bucket.savingsEur === null,
    partial: bucket.suppliesWithData < bucket.supplyCount ? { reported: bucket.suppliesWithData, total: bucket.supplyCount } : null,
    selfConsumptionKWh: bucket.selfConsumptionKWh,
    gridImportKWh: bucket.gridImportKWh,
    surplusKWh: bucket.surplusKWh,
    savingsEur: bucket.savingsEur ?? 0,
  };
}

type SupplyBucket = Pick<SupplyConsumptionBucketResponse, "obtainMethod" | "selfConsumptionKWh" | "gridImportKWh" | "surplusKWh" | "savingsEur">;

function supplyReading(bucket: SupplyBucket): BucketReading {
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

const pad = (value: number) => String(value).padStart(2, "0");

/** "14:00": an hour as the clock shows it. */
const clockText = (hour: number) => `${pad(hour)}:00`;

/**
 * "De 14:00 a 15:00", named by the clock: it ends at the next hour by name,
 * so the hour before the March change reads "De 01:00 a 02:00" although the
 * clock jumps to 03:00, and both October 02:00 read "De 02:00 a 03:00".
 */
export const hourRangeText = (first: SlotHour, last: SlotHour = first) =>
  `de ${clockText(first.clockHour)} a ${clockText((last.clockHour + 1) % 24)}`;

const withRepeatedNote = (hour: SlotHour, text: string) => (hour.repeated ? `${text} ${REPEATED_HOUR_NOTE}` : text);

/** The hour's name in the tooltip: "De 14:00 a 15:00", with the note on a repeated hour. */
const hourName = (hour: SlotHour) => withRepeatedNote(hour, capitalise(hourRangeText(hour)));

/** The hour's row in the data table: "14:00–15:00", with the note on a repeated hour. */
const hourTableLabel = (hour: SlotHour) =>
  withRepeatedNote(hour, `${clockText(hour.clockHour)}–${clockText((hour.clockHour + 1) % 24)}`);

function axisLabelOf({ day, hour }: AxisSlot, index: number, granularity: Granularity, step: number): string {
  if (index % step !== 0) return "";
  if (hour) return `${hour.clockHour} h`;
  const key = formatDayKey(day);
  if (granularity === "daily") return formatShortDay(key);
  // The year where it changes, and on the first month, so 24 months read unambiguously.
  return index === 0 || day.month === 1 ? `${formatShortMonth(key)} ${String(day.year).slice(2)}` : formatShortMonth(key);
}

function rowLabelOf({ day, hour }: AxisSlot, granularity: Granularity): string {
  if (hour) return `${hour.clockHour} h`;
  const key = formatDayKey(day);
  return granularity === "daily" ? formatShortDay(key) : `${formatShortMonth(key)} ${String(day.year).slice(2)}`;
}

function nameOf({ key, hour }: AxisSlot, granularity: Granularity): string {
  if (hour) return hourName(hour);
  return granularity === "daily" ? formatCalendarDay(key) : capitalise(formatCalendarMonth(key));
}

function slotOf(slot: AxisSlot, index: number, reading: BucketReading | undefined, granularity: Granularity, step: number): SlotView {
  const { key, day, hour } = slot;
  const state = stateOf(reading);
  const base = {
    key,
    day,
    hour,
    axisLabel: axisLabelOf(slot, index, granularity, step),
    name: nameOf(slot, granularity),
    tableLabel: hour ? hourTableLabel(hour) : nameOf(slot, granularity),
    rowLabel: rowLabelOf(slot, granularity),
    startsMonthOrYear: granularity === "daily" ? day.day === 1 : granularity === "monthly" && day.month === 1,
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

/** "del 14 al 16 de julio de 2026", "de febrero a marzo de 2026", "de julio de 2026", "de 14:00 a 16:00". */
function gapRangePhrase([first, last]: [SlotView, SlotView], granularity: Granularity): string {
  if (first.hour && last.hour) return hourRangeText(first.hour, last.hour);
  if (granularity === "daily") return compareDays(first.day, last.day) === 0 ? `del ${dayName(first.day)}` : `del ${dayRangePhrase(first.day, last.day)}`;
  return compareDays(first.day, last.day) === 0 ? `de ${monthYearName(first.day)}` : `de ${monthRangePhrase(first.day, last.day)}`;
}

/**
 * "el 3 de julio de 2026", "los días del 14 al 16 de julio de 2026", "julio de 2026",
 * "los meses de febrero a marzo de 2026", "la hora de 14:00 a 15:00", "las horas de 14:00 a 16:00".
 */
function partialRangePhrase([first, last]: [SlotView, SlotView], granularity: Granularity): string {
  if (first.hour && last.hour) return `${first === last ? "la hora" : "las horas"} ${hourRangeText(first.hour, last.hour)}`;
  const single = compareDays(first.day, last.day) === 0;
  if (granularity === "daily") return single ? `el ${dayName(first.day)}` : `los días del ${dayRangePhrase(first.day, last.day)}`;
  return single ? monthYearName(first.day) : `los meses de ${monthRangePhrase(first.day, last.day)}`;
}

function gapsNoticeOf(slots: SlotView[], granularity: Granularity): string | null {
  const runs = runsOf(slots, (slot) => slot.state.kind === "gap");
  if (runs.length === 0) return null;
  const ranges = joinPhrases(runs.map((run) => gapRangePhrase(run, granularity)));
  const unit = UNIT[granularity];
  return `Faltan datos ${ranges}. Los totales suman solo ${unit.the} ${unit.many} con datos.`;
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
      const marked = several ? `${unit.those} ${unit.many} se marcan como parciales.` : `${unit.thatOne} ${unit.one} se marca como parcial.`;
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
 * still on it, as a gap. A day's or a month's bucket is matched to its slot
 * by its `date` string, never parsed as an instant; an hour's by its
 * `startsAt` instant, never by `date` and `time` (#378).
 *
 * Every figure is a bucket's own, but one: below sm, a row states the slot's
 * consumption, its community energy plus its grid energy, which no bucket
 * carries (UI-HIS-025). What the client also counts is slots by state (the
 * coverage line, the notices), the clock's hours on an hourly axis, to find
 * the one shown twice, where a partial slot's bar ends, to place its marker,
 * and where each row scale ends.
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
  const step = Math.max(1, Math.ceil(LABEL_WIDTH[granularity] / SLOT_WIDTH[granularity]));
  const slots = axisSlotsOf(period).map((slot, index) => slotOf(slot, index, readings.get(slot.key), granularity, step));
  const isMembership = series.kind === "membershipHourly" || series.kind === "membershipDaily" || series.kind === "membershipMonthly";

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
