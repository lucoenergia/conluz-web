import { APP_TIME_ZONE } from "../../../utils/formatCalendarDate";
import type { ReferencePeriod } from "./useMemberEnergyMetrics";

export interface WallTime {
  year: number;
  /** 1-12. */
  month: number;
  day: number;
  hour: number;
}

const wallTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

/** The wall-clock time an instant reads as in the app's time zone. */
export function wallTimeAt(instantMs: number): WallTime & { minute: number; second: number } {
  const parts = Object.fromEntries(
    wallTimeFormat.formatToParts(instantMs).map(({ type, value }) => [type, Number(value)]),
  ) as Record<Intl.DateTimeFormatPartTypes, number>;
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

/** Minutes the app's time zone is ahead of UTC at an instant: 120 in Madrid's summer, 60 in its winter. */
function offsetMinutesAt(instantMs: number): number {
  const wall = wallTimeAt(instantMs);
  const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return Math.round((wallAsUtc - instantMs) / 60_000);
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * A wall-clock hour in the app's time zone, as the backend writes a month's
 * bounds: local time with the offset in force at that instant
 * ("2026-11-01T00:00:00+01:00"). The offset is looked up twice because the
 * first guess is taken at the wrong instant whenever a transition lies between
 * the wall time read as UTC and the real one.
 */
export function zonedIso({ year, month, day, hour }: WallTime): string {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour);
  const firstGuess = offsetMinutesAt(wallAsUtc);
  const offset = offsetMinutesAt(wallAsUtc - firstGuess * 60_000);
  const sign = offset < 0 ? "-" : "+";
  const absolute = Math.abs(offset);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:00:00${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/**
 * The month `monthsBack` months before the reference month, bounded the way
 * the backend bounds a month: the half-open period from 00:00 on its first day
 * to 00:00 on the first day of the next month, which it excludes, in the app's
 * time zone. Each bound carries the offset in force at its own instant, so a
 * month with a daylight-saving transition starts and ends on different offsets.
 *
 * Derived from the reference month's start alone -- never from the device
 * clock or the device's time zone -- so every period counted back from the
 * reference month is counted from the month the server resolved, whatever day
 * and wherever it is read.
 */
export function monthBefore(referenceStart: string, monthsBack: number): ReferencePeriod {
  const reference = wallTimeAt(Date.parse(referenceStart));
  // Months counted from year 0, so stepping back across any number of years is one subtraction.
  const monthIndex = reference.year * 12 + (reference.month - 1) - monthsBack;
  const firstDayOf = (index: number) => zonedIso({ year: Math.floor(index / 12), month: (index % 12) + 1, day: 1, hour: 0 });

  return {
    startDate: firstDayOf(monthIndex),
    endDate: firstDayOf(monthIndex + 1),
  };
}
