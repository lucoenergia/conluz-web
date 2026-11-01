import { formatCalendarMonth } from "../../utils/formatEnergyFigures";
import { APP_TIME_ZONE } from "../../utils/formatCalendarDate";
import { wallTimeAt, zonedIso } from "../home/member/monthBounds";

/**
 * The periods of the historical analysis page (#248, ADR-0005 in
 * lucoenergia/conluz).
 *
 * Every period is anchored to the latest published month the server resolved
 * for the selected scope, and built from calendar values (year, month, day) in
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

export type PresetKind = "latest" | "year" | "last12";

/** What the caller picked. A custom range's days are both included, as the user reads them. */
export type PeriodSelection = { kind: PresetKind } | { kind: "custom"; from: CalendarDay; to: CalendarDay };

export type Granularity = "daily" | "monthly";

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
  /** "Este año" before its January is published. */
  | { status: "yearEmpty"; year: number }
  /** More than MAX_MONTHS after snapping. */
  | { status: "tooLong"; pickedDays: number }
  /** A custom range that ends after the anchor month, or runs backwards. */
  | { status: "unpickable" };

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

function addDays(day: CalendarDay, days: number): CalendarDay {
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

/** 00:00 of a calendar day in the app's time zone. */
function startOfDay(day: CalendarDay): string {
  return zonedIso({ ...day, hour: 0 });
}

/** The calendar month an anchor period starts in, read in the app's time zone. */
export function anchorFromPeriodStart(startDate: string): CalendarMonth {
  const { year, month } = wallTimeAt(Date.parse(startDate));
  return { year, month };
}

/**
 * The year "Este año" is about. The current month is never published, so an
 * anchor in December means the current month is January of the next year or
 * later, and that January is not published yet. Any other anchor is read as
 * the current year: without the device clock, nothing tells the few days
 * between New Year and the publication of December apart.
 */
export function thisYearOf(anchor: CalendarMonth): number {
  return anchor.month === 12 ? anchor.year + 1 : anchor.year;
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
function dayRangePhrase(from: CalendarDay, to: CalendarDay): string {
  if (compareDays(from, to) === 0) return dayName(from);
  if (from.year !== to.year) return `${dayName(from)} al ${dayName(to)}`;
  if (from.month !== to.month) return `${dayMonthName(from)} al ${dayName(to)}`;
  return `${from.day} al ${dayName(to)}`;
}

/** "enero a septiembre de 2026" or "octubre de 2025 a septiembre de 2026". */
export function monthRangePhrase(from: CalendarMonth, to: CalendarMonth): string {
  return from.year === to.year ? `${monthName(from)} a ${monthYearName(to)}` : `${monthYearName(from)} a ${monthYearName(to)}`;
}

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

/**
 * A range of calendar days as the page shows it. Up to DAILY_LIMIT_DAYS days
 * it is shown day by day, as picked. Longer, it is widened to the whole months
 * containing its first and last day and shown month by month, so the totals
 * and the monthly buckets cover the same period (ADR-0005). The cap applies
 * to the snapped period, which is what gets requested.
 */
function resolveRange(from: CalendarDay, to: CalendarDay): PeriodResolution {
  const pickedDays = calendarDayCount(from, to);
  const granularity: Granularity = pickedDays <= DAILY_LIMIT_DAYS ? "daily" : "monthly";
  const months = monthIndex(to) - monthIndex(from) + 1;
  if (granularity === "monthly" && months > MAX_MONTHS) return { status: "tooLong", pickedDays };

  const first = granularity === "daily" ? from : firstDayOf(from);
  const last = granularity === "daily" ? to : lastDayOf(to);
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

/** The period a selection stands for, given the latest published month of the selected scope. */
export function resolvePeriod(anchor: CalendarMonth, selection: PeriodSelection): PeriodResolution {
  const anchorEnd = lastDayOf(anchor);

  switch (selection.kind) {
    case "latest":
      return resolveRange(firstDayOf(anchor), anchorEnd);
    case "year": {
      const year = thisYearOf(anchor);
      if (year > anchor.year) return { status: "yearEmpty", year };
      return resolveRange({ year, month: 1, day: 1 }, anchorEnd);
    }
    case "last12":
      return resolveRange(firstDayOf(addMonths(anchor, -11)), anchorEnd);
    case "custom":
      if (compareDays(selection.from, selection.to) > 0 || compareDays(selection.to, anchorEnd) > 0) {
        return { status: "unpickable" };
      }
      return resolveRange(selection.from, selection.to);
  }
}

/** "62 días: se mostrará por días.", what the range picker says before it is applied. */
export function rangeResultText(resolution: PeriodResolution): string | null {
  if (resolution.status !== "ok") return null;
  const days = `${resolution.pickedDays} ${resolution.pickedDays === 1 ? "día" : "días"}`;
  if (resolution.period.granularity === "daily") return `${days}: se mostrará por días.`;
  return `${days}: se mostrará por meses, de ${monthRangePhrase(resolution.firstDay, resolution.lastDay)}.`;
}

/** "Septiembre de 2026 · por días", how a preset is offered. */
export function presetSummary(resolution: PeriodResolution): string {
  switch (resolution.status) {
    case "ok":
      return `${resolution.period.label} · ${resolution.period.granularity === "daily" ? "por días" : "por meses"}`;
    case "yearEmpty":
      return `Aún no hay datos de ${resolution.year}`;
    default:
      return "";
  }
}

// ─── Anchor changes ──────────────────────────────────────────────────────────

/**
 * A selection made against one anchor, met by another (or arriving in a link).
 * A custom range ending after the anchor month is clamped to its last day; one
 * that starts after it would be empty, so it falls back to the latest
 * published month. `adjusted` says the user must be told.
 */
export function clampToAnchor(selection: PeriodSelection, anchor: CalendarMonth): { selection: PeriodSelection; adjusted: boolean } {
  if (selection.kind !== "custom") return { selection, adjusted: false };
  const anchorEnd = lastDayOf(anchor);
  if (compareDays(selection.to, anchorEnd) <= 0) return { selection, adjusted: false };
  if (compareDays(selection.from, anchorEnd) > 0) return { selection: { kind: "latest" }, adjusted: true };
  return { selection: { kind: "custom", from: selection.from, to: anchorEnd }, adjusted: true };
}

// ─── Query string ────────────────────────────────────────────────────────────

export const PERIOD_PARAM = "period";
export const FROM_PARAM = "from";
export const TO_PARAM = "to";

const PRESETS: readonly PresetKind[] = ["latest", "year", "last12"];

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
 * is the default, "Último mes publicado".
 */
export function parseSelection(params: URLSearchParams): PeriodSelection | null {
  const kind = params.get(PERIOD_PARAM);
  if (kind === null) return params.has(FROM_PARAM) || params.has(TO_PARAM) ? null : { kind: "latest" };
  if ((PRESETS as readonly string[]).includes(kind)) {
    return params.has(FROM_PARAM) || params.has(TO_PARAM) ? null : { kind: kind as PresetKind };
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
 * - Not a selection at all (an unknown period, a date that does not exist, a
 *   range running backwards): the default, silently.
 * - A custom range past the anchor month: clamped to it, or the default when
 *   nothing would be left, and the user is told (`adjusted`).
 * - A range that still cannot be requested (over the cap): the default, silently.
 *
 * `rewrite` says the query string no longer holds what is shown.
 */
export function settleSelection(
  parsed: PeriodSelection | null,
  anchor: CalendarMonth,
): { selection: PeriodSelection; adjusted: boolean; rewrite: boolean } {
  const latest: PeriodSelection = { kind: "latest" };
  if (!parsed) return { selection: latest, adjusted: false, rewrite: true };

  const clamped = clampToAnchor(parsed, anchor);
  const status = resolvePeriod(anchor, clamped.selection).status;
  const selection = status === "tooLong" || status === "unpickable" ? latest : clamped.selection;
  return { selection, adjusted: clamped.adjusted, rewrite: !sameSelection(selection, parsed) };
}
