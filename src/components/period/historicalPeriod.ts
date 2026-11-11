import { formatCalendarMonth } from "../../utils/formatEnergyFigures";
import { APP_TIME_ZONE } from "../../utils/formatCalendarDate";
import { wallTimeAt, zonedIso } from "../../utils/zonedTime";

/**
 * The periods of the historical analysis page (#248, ADR-0005 in
 * lucoenergia/conluz).
 *
 * Every period is anchored to the latest published period the server resolved
 * for the selected scope (a calendar month, or a calendar day), and built from
 * calendar values (year, month, day) in
 * the app's time zone. Nothing here reads the device clock or the device's
 * time zone: the same anchor and selection give the same bounds wherever and
 * whenever they are resolved.
 *
 * Bounds are half-open, `[startDate, endDate)`, as the backend reads them
 * (EPR-001 in lucoenergia/conluz#409): a day ends at 00:00 of the next day and
 * a month at 00:00 of the first day of the next month.
 */

/** A calendar month in the app's time zone. `month` is 1-12. */
export interface CalendarMonth {
  year: number;
  month: number;
}

/** A calendar day in the app's time zone. */
export interface CalendarDay extends CalendarMonth {
  day: number;
}

/**
 * The latest published period of the selected scope, as the server resolved
 * it: a calendar month, or a calendar day. No period ends after it.
 */
export type Anchor = { kind: "month"; month: CalendarMonth } | { kind: "day"; day: CalendarDay };

/** A preset's query value. Each page offers its own list of presets (`PresetDefinition`). */
export type PresetKind = "latest" | "year" | "last12" | "last7" | "last30";

/** What the caller picked. A custom range's days are both included, as the user reads them. */
export type PeriodSelection = { kind: PresetKind } | { kind: "custom"; from: CalendarDay; to: CalendarDay };

export type Granularity = "hourly" | "daily" | "monthly";

/** A period ready to request: what later issues fetch the figures for. */
export interface HistoricalPeriod {
  /** Included. The app's time zone, with the offset in force at that instant. */
  startDate: string;
  /** Excluded. The app's time zone, with the offset in force at that instant. */
  endDate: string;
  granularity: Granularity;
  /** The period on its own, capitalised: "Del 1 de julio al 31 de agosto de 2026". */
  label: string;
}

/** A range longer than the daily limit, widened to the whole months that contain its first and last day. */
export interface SnappedRange {
  from: CalendarDay;
  to: CalendarDay;
  months: number;
  /** What the header says about it. */
  text: string;
}

export type PeriodResolution =
  | {
      status: "ok";
      period: HistoricalPeriod;
      /** "Datos de septiembre de 2026". */
      title: string;
      /** The first and last calendar day the period covers, after snapping. */
      firstDay: CalendarDay;
      lastDay: CalendarDay;
      /** Calendar days the user picked, before snapping. */
      pickedDays: number;
      snapped: SnappedRange | null;
    }
  /** More than MAX_MONTHS after snapping. */
  | { status: "tooLong"; pickedDays: number }
  /** A custom range that ends after the anchor or runs backwards, or a preset the page does not offer for this anchor. */
  | { status: "unpickable" };

/** A custom range of this many calendar days is shown hour by hour (#378). */
export const HOURLY_DAYS = 1;

/** Up to this many calendar days a period is shown day by day. */
export const DAILY_LIMIT_DAYS = 62;

/** The longest period, in calendar months after snapping (EPR-004). */
export const MAX_MONTHS = 24;

const MS_PER_DAY = 86_400_000;
const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Days since 1970-01-01 of a calendar date. UTC is only the arithmetic here:
 * a calendar date has no instant, so counting dates in UTC, where every day
 * lasts 24 hours, counts calendar days, whatever daylight-saving change the
 * app's time zone has in between.
 */
function dayNumber({ year, month, day }: CalendarDay): number {
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

function dayFromNumber(dayNumberValue: number): CalendarDay {
  const date = new Date(dayNumberValue * MS_PER_DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** Calendar days from `from` to `to`, both included. */
export function calendarDayCount(from: CalendarDay, to: CalendarDay): number {
  return dayNumber(to) - dayNumber(from) + 1;
}

export function compareDays(a: CalendarDay, b: CalendarDay): number {
  return dayNumber(a) - dayNumber(b);
}

export function addDays(day: CalendarDay, days: number): CalendarDay {
  return dayFromNumber(dayNumber(day) + days);
}

/** Months counted from year 0, so stepping across years is one subtraction. */
function monthIndex({ year, month }: CalendarMonth): number {
  return year * 12 + month - 1;
}

function monthFromIndex(index: number): CalendarMonth {
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function addMonths(month: CalendarMonth, months: number): CalendarMonth {
  return monthFromIndex(monthIndex(month) + months);
}

export function lastDayOf({ year, month }: CalendarMonth): CalendarDay {
  return { year, month, day: new Date(Date.UTC(year, month, 0)).getUTCDate() };
}

const firstDayOf = ({ year, month }: CalendarMonth): CalendarDay => ({ year, month, day: 1 });

export const monthAnchor = (month: CalendarMonth): Anchor => ({ kind: "month", month });

export const dayAnchor = (day: CalendarDay): Anchor => ({ kind: "day", day });

/** The last calendar day an anchor covers: a month's last day, or the day itself. No period ends after it. */
export function anchorEnd(anchor: Anchor): CalendarDay {
  return anchor.kind === "month" ? lastDayOf(anchor.month) : anchor.day;
}

/** The calendar month an anchor falls in. */
export function anchorMonth(anchor: Anchor): CalendarMonth {
  const { year, month } = anchorEnd(anchor);
  return { year, month };
}

/** 00:00 of a calendar day in the app's time zone. */
function startOfDay(day: CalendarDay): string {
  return zonedIso({ ...day, hour: 0 });
}

/** The calendar day an instant falls on, read in the app's time zone: a period bound's day. */
export function calendarDayOf(isoInstant: string): CalendarDay {
  const { year, month, day } = wallTimeAt(Date.parse(isoInstant));
  return { year, month, day };
}

/** A calendar day written as the API writes a bucket's `date`: "2026/07/01". */
export const formatDayKey = ({ year, month, day }: CalendarDay) => `${year}/${pad(month)}/${pad(day)}`;

/** The calendar month an anchor period starts in, read in the app's time zone. */
export function anchorFromPeriodStart(startDate: string): CalendarMonth {
  const { year, month } = wallTimeAt(Date.parse(startDate));
  return { year, month };
}

// ─── Labels ──────────────────────────────────────────────────────────────────

// Noon UTC of a calendar date is the same date in Madrid, whatever the offset.
const noonOf = ({ year, month, day }: CalendarDay) => new Date(Date.UTC(year, month - 1, day, 12));

const DAY_MONTH = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: APP_TIME_ZONE });
const MONTH = new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: APP_TIME_ZONE });

/** "julio". */
export const monthName = (month: CalendarMonth) => MONTH.format(noonOf(firstDayOf(month)));

/** "julio de 2026". */
export const monthYearName = ({ year, month }: CalendarMonth) => formatCalendarMonth(`${year}/${pad(month)}/01`);

/** "1 de julio". */
const dayMonthName = (day: CalendarDay) => DAY_MONTH.format(noonOf(day));

/** "1 de julio de 2026". */
export const dayName = (day: CalendarDay) => `${dayMonthName(day)} de ${day.year}`;

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "1 de julio al 31 de agosto de 2026", "1 al 30 de septiembre de 2026", or one day alone. */
export function dayRangePhrase(from: CalendarDay, to: CalendarDay): string {
  if (compareDays(from, to) === 0) return dayName(from);
  if (from.year !== to.year) return `${dayName(from)} al ${dayName(to)}`;
  if (from.month !== to.month) return `${dayMonthName(from)} al ${dayName(to)}`;
  return `${from.day} al ${dayName(to)}`;
}

/** "enero a septiembre de 2026" or "octubre de 2025 a septiembre de 2026". */
export function monthRangePhrase(from: CalendarMonth, to: CalendarMonth): string {
  return from.year === to.year ? `${monthName(from)} a ${monthYearName(to)}` : `${monthYearName(from)} a ${monthYearName(to)}`;
}

/** How the granularity reads after a period's name: "por días". */
export const GRANULARITY_PHRASE: Readonly<Record<Granularity, string>> = { hourly: "por horas", daily: "por días", monthly: "por meses" };

const isWholeMonth = (from: CalendarDay, to: CalendarDay) =>
  from.day === 1 && from.year === to.year && from.month === to.month && to.day === lastDayOf(to).day;

const isSingleDay = (from: CalendarDay, to: CalendarDay) => compareDays(from, to) === 0;

/** The label and the header title of the days a period covers. */
function describe(from: CalendarDay, to: CalendarDay, granularity: Granularity): { label: string; title: string } {
  if (granularity === "monthly" || isWholeMonth(from, to)) {
    if (from.year === to.year && from.month === to.month) {
      const month = monthYearName(from);
      return { label: capitalise(month), title: `Datos de ${month}` };
    }
    const range = monthRangePhrase(from, to);
    return { label: `De ${range}`, title: `Datos de ${range}` };
  }
  const range = dayRangePhrase(from, to);
  if (isSingleDay(from, to)) return { label: capitalise(range), title: `Datos del ${range}` };
  return { label: `Del ${range}`, title: `Datos del ${range}` };
}

/** "de julio de 2026 a septiembre de 2026", as the snapped and result texts name a month range: both years always. */
const fullMonthRange = (from: CalendarMonth, to: CalendarMonth) => `${monthYearName(from)} a ${monthYearName(to)}`;

function snappedText(from: CalendarDay, to: CalendarDay, months: number): string {
  return (
    `Elegiste del ${dayRangePhrase(from, to)}. Como son más de ${DAILY_LIMIT_DAYS} días, lo mostramos por meses ` +
    `completos: de ${fullMonthRange(from, to)} (${months} meses).`
  );
}

// ─── Resolution ──────────────────────────────────────────────────────────────

/** Hourly for a single day picked as a custom range; daily up to DAILY_LIMIT_DAYS; monthly above. */
function granularityOf(pickedDays: number, hourlyAllowed: boolean): Granularity {
  if (hourlyAllowed && pickedDays === HOURLY_DAYS) return "hourly";
  return pickedDays <= DAILY_LIMIT_DAYS ? "daily" : "monthly";
}

/**
 * A range of calendar days as the page shows it. A single day picked as a
 * custom range is shown hour by hour (#378); a preset never is. Up to
 * DAILY_LIMIT_DAYS days it is shown day by day, as picked. Longer, it is
 * widened to the whole months containing its first and last day and shown
 * month by month, so the totals and the monthly buckets cover the same period
 * (ADR-0005). The cap applies to the snapped period, which is what gets
 * requested.
 *
 * Widening never moves the end past the anchor's last day (`end`): under a
 * month anchor the last month is whole anyway; under a day anchor it ends at
 * that day, and its bucket is partial.
 */
function resolveRange(from: CalendarDay, to: CalendarDay, end: CalendarDay, hourlyAllowed = false): PeriodResolution {
  const pickedDays = calendarDayCount(from, to);
  const granularity = granularityOf(pickedDays, hourlyAllowed);
  const months = monthIndex(to) - monthIndex(from) + 1;
  if (granularity === "monthly" && months > MAX_MONTHS) return { status: "tooLong", pickedDays };

  const first = granularity === "monthly" ? firstDayOf(from) : from;
  const monthEnd = lastDayOf(to);
  const last = granularity !== "monthly" ? to : compareDays(monthEnd, end) <= 0 ? monthEnd : end;
  const { label, title } = describe(first, last, granularity);
  const moved = compareDays(first, from) !== 0 || compareDays(last, to) !== 0;

  return {
    status: "ok",
    period: { startDate: startOfDay(first), endDate: startOfDay(addDays(last, 1)), granularity, label },
    title,
    firstDay: first,
    lastDay: last,
    pickedDays,
    snapped: moved ? { from: first, to: last, months, text: snappedText(from, to, months) } : null,
  };
}

/**
 * A custom range against the anchor: both days included, picked by the user.
 * One that runs backwards or ends after the anchor cannot be requested.
 */
export function resolveCustomRange(anchor: Anchor, from: CalendarDay, to: CalendarDay): PeriodResolution {
  const end = anchorEnd(anchor);
  if (compareDays(from, to) > 0 || compareDays(to, end) > 0) return { status: "unpickable" };
  return resolveRange(from, to, end, true);
}

/**
 * The period a selection stands for, given the anchor of the selected scope
 * and the presets the page offers. A preset the list leaves out, or one that
 * does not take this kind of anchor, cannot be requested.
 */
export function resolvePeriod(anchor: Anchor, selection: PeriodSelection, presets: readonly PresetDefinition[]): PeriodResolution {
  if (selection.kind === "custom") return resolveCustomRange(anchor, selection.from, selection.to);
  const preset = offeredPresets(presets, anchor).find(({ value }) => value === selection.kind);
  if (!preset) return { status: "unpickable" };
  const { from, to } = preset.range(anchor);
  return resolveRange(from, to, anchorEnd(anchor));
}

/** "62 días: se mostrará por días.", what the range picker says before it is applied. */
export function rangeResultText(resolution: PeriodResolution): string | null {
  if (resolution.status !== "ok") return null;
  const days = `${resolution.pickedDays} ${resolution.pickedDays === 1 ? "día" : "días"}`;
  if (resolution.period.granularity === "hourly") return `${days}: se mostrará por horas.`;
  if (resolution.period.granularity === "daily") return `${days}: se mostrará por días.`;
  return `${days}: se mostrará por meses, de ${monthRangePhrase(resolution.firstDay, resolution.lastDay)}.`;
}

// ─── Presets ─────────────────────────────────────────────────────────────────

/** A period a page offers by name, derived from the anchor alone. */
export interface PresetDefinition {
  /** Its value in the query string: ?period={value}. Unique within a page's list. */
  value: PresetKind;
  name: (anchor: Anchor) => string;
  /** The kinds of anchor it derives a period from. A page offers it only against one of them. */
  accepts: readonly Anchor["kind"][];
  /** Its first and last calendar day, both included. */
  range: (anchor: Anchor) => { from: CalendarDay; to: CalendarDay };
  /** How it is offered, when its period's label and granularity would not say it: see `presetSummary`. */
  summary?: (anchor: Anchor, resolution: Extract<PeriodResolution, { status: "ok" }>) => string;
}

/** The presets of a list that take this kind of anchor, in the list's order: the ones a page offers. */
export function offeredPresets(presets: readonly PresetDefinition[], anchor: Anchor): PresetDefinition[] {
  return presets.filter(({ accepts }) => accepts.includes(anchor.kind));
}

/** "Año 2026", the name of the year preset: the year of the anchor's month or day. */
export const yearPresetName = (anchor: CalendarMonth) => `Año ${anchor.year}`;

/** "Último mes publicado": the anchor month. */
export const LATEST: PresetDefinition = {
  value: "latest",
  name: () => "Último mes publicado",
  accepts: ["month"],
  range: (anchor) => ({ from: firstDayOf(anchorMonth(anchor)), to: anchorEnd(anchor) }),
};

/**
 * "Año {año}": the anchor's own year, from January to the anchor month. It
 * never assumes which year today is, so it needs no clock. Its name carries
 * the year, so its summary names only the months: "De enero a septiembre · por meses".
 */
export const YEAR: PresetDefinition = {
  value: "year",
  name: (anchor) => yearPresetName(anchorEnd(anchor)),
  accepts: ["month"],
  range: (anchor) => ({ from: { year: anchorEnd(anchor).year, month: 1, day: 1 }, to: anchorEnd(anchor) }),
  summary: (anchor, resolution) => {
    const month = anchorMonth(anchor);
    const months = month.month === 1 ? capitalise(monthName(month)) : `De enero a ${monthName(month)}`;
    return `${months} · ${GRANULARITY_PHRASE[resolution.period.granularity]}`;
  },
};

/** "Últimos 12 meses": the anchor month and the eleven before it. */
export const LAST_12: PresetDefinition = {
  value: "last12",
  name: () => "Últimos 12 meses",
  accepts: ["month"],
  range: (anchor) => ({ from: firstDayOf(addMonths(anchorMonth(anchor), -11)), to: anchorEnd(anchor) }),
};

/** "Últimos 7 días": the anchor day and the six before it. */
export const LAST_7: PresetDefinition = {
  value: "last7",
  name: () => "Últimos 7 días",
  accepts: ["day"],
  range: (anchor) => ({ from: addDays(anchorEnd(anchor), -6), to: anchorEnd(anchor) }),
};

/** "Últimos 30 días": the anchor day and the 29 before it. */
export const LAST_30: PresetDefinition = {
  value: "last30",
  name: () => "Últimos 30 días",
  accepts: ["day"],
  range: (anchor) => ({ from: addDays(anchorEnd(anchor), -29), to: anchorEnd(anchor) }),
};

/**
 * "Año {año}" under a day anchor: the anchor's own year, from 1 January to the
 * anchor day. Its query value is the month anchor's year preset's: a page
 * offers one or the other, never both.
 */
export const DAY_YEAR: PresetDefinition = {
  value: "year",
  name: (anchor) => yearPresetName(anchorEnd(anchor)),
  accepts: ["day"],
  range: (anchor) => ({ from: { year: anchorEnd(anchor).year, month: 1, day: 1 }, to: anchorEnd(anchor) }),
};

/**
 * How a preset is offered: the period it resolves to and its granularity.
 * "Septiembre de 2026 · por días", unless the preset says it its own way.
 */
export function presetSummary(anchor: Anchor, preset: PresetDefinition): string {
  const resolution = resolvePeriod(anchor, { kind: preset.value }, [preset]);
  if (resolution.status !== "ok") return "";
  if (preset.summary) return preset.summary(anchor, resolution);
  return `${resolution.period.label} · ${GRANULARITY_PHRASE[resolution.period.granularity]}`;
}

// ─── Anchor changes ──────────────────────────────────────────────────────────

/**
 * A selection made against one anchor, met by another (or arriving in a link).
 * A custom range ending after the anchor is clamped to its last day; one that
 * starts after it would be empty, so it falls back to the page's default
 * preset. `adjusted` says the user must be told.
 */
export function clampToAnchor(
  selection: PeriodSelection,
  anchor: Anchor,
  defaultPreset: PresetDefinition,
): { selection: PeriodSelection; adjusted: boolean } {
  if (selection.kind !== "custom") return { selection, adjusted: false };
  const end = anchorEnd(anchor);
  if (compareDays(selection.to, end) <= 0) return { selection, adjusted: false };
  if (compareDays(selection.from, end) > 0) return { selection: { kind: defaultPreset.value }, adjusted: true };
  return { selection: { kind: "custom", from: selection.from, to: end }, adjusted: true };
}

// ─── Query string ────────────────────────────────────────────────────────────

export const PERIOD_PARAM = "period";
export const FROM_PARAM = "from";
export const TO_PARAM = "to";

/** "2026-07-01". */
export const formatDayParam = ({ year, month, day }: CalendarDay) => `${year}-${pad(month)}-${pad(day)}`;

/** A real calendar day written as yyyy-MM-dd, or null. */
export function parseDayParam(value: string | null): CalendarDay | null {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const day = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  // 2026-02-30 rolls over to March: only a date that reads back the same is real.
  return formatDayParam(dayFromNumber(dayNumber(day))) === value ? day : null;
}

/**
 * The selection in the query string, or null when it is not one. No `period`
 * is the page's default preset; a preset the page's list leaves out is none.
 */
export function parseSelection(
  params: URLSearchParams,
  presets: readonly PresetDefinition[],
  defaultPreset: PresetDefinition,
): PeriodSelection | null {
  const kind = params.get(PERIOD_PARAM);
  if (kind === null) return params.has(FROM_PARAM) || params.has(TO_PARAM) ? null : { kind: defaultPreset.value };
  const preset = presets.find(({ value }) => value === kind);
  if (preset) {
    return params.has(FROM_PARAM) || params.has(TO_PARAM) ? null : { kind: preset.value };
  }
  if (kind !== "custom") return null;
  const from = parseDayParam(params.get(FROM_PARAM));
  const to = parseDayParam(params.get(TO_PARAM));
  if (!from || !to || compareDays(from, to) > 0) return null;
  return { kind: "custom", from, to };
}

/** Writes a selection into the query string, leaving every other parameter alone. */
export function writeSelection(params: URLSearchParams, selection: PeriodSelection): URLSearchParams {
  params.set(PERIOD_PARAM, selection.kind);
  if (selection.kind === "custom") {
    params.set(FROM_PARAM, formatDayParam(selection.from));
    params.set(TO_PARAM, formatDayParam(selection.to));
  } else {
    params.delete(FROM_PARAM);
    params.delete(TO_PARAM);
  }
  return params;
}

export function sameSelection(a: PeriodSelection, b: PeriodSelection): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind !== "custom" || b.kind !== "custom") return true;
  return compareDays(a.from, b.from) === 0 && compareDays(a.to, b.to) === 0;
}

/**
 * What a selection read from the query string becomes once it meets the
 * anchor -- on arrival from a link, after a community switch, or when the
 * selected supply changes the anchor; the rule is the same every time.
 *
 * - Not a selection at all (an unknown period, a preset the page does not
 *   offer, a date that does not exist, a range running backwards): the
 *   page's default preset, silently.
 * - A custom range past the anchor: clamped to it, or the default when
 *   nothing would be left, and the user is told (`adjusted`).
 * - A selection that still cannot be requested (over the cap, or a preset
 *   that does not take this kind of anchor): the default, silently.
 *
 * `rewrite` says the query string no longer holds what is shown.
 */
export function settleSelection(
  parsed: PeriodSelection | null,
  anchor: Anchor,
  presets: readonly PresetDefinition[],
  defaultPreset: PresetDefinition,
): { selection: PeriodSelection; adjusted: boolean; rewrite: boolean } {
  const fallback: PeriodSelection = { kind: defaultPreset.value };
  if (!parsed) return { selection: fallback, adjusted: false, rewrite: true };

  const clamped = clampToAnchor(parsed, anchor, defaultPreset);
  const status = resolvePeriod(anchor, clamped.selection, presets).status;
  const selection = status === "tooLong" || status === "unpickable" ? fallback : clamped.selection;
  return { selection, adjusted: clamped.adjusted, rewrite: !sameSelection(selection, parsed) };
}
