import { APP_TIME_ZONE } from "../../../utils/formatCalendarDate";
import type { ReferencePeriod } from "./useMemberEnergyMetrics";

/** The last hourly record of a day: both bounds are inclusive, so a month ends on this hour, not on the next midnight. */
const LAST_HOUR_OF_DAY = 23;

interface WallTime {
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
function wallTimeAt(instantMs: number): WallTime & { minute: number; second: number } {
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
 * ("2026-10-31T23:00:00+01:00"). The offset is looked up twice because the
 * first guess is taken at the wrong instant whenever a transition lies between
 * the wall time read as UTC and the real one.
 */
function zonedIso({ year, month, day, hour }: WallTime): string {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour);
  const firstGuess = offsetMinutesAt(wallAsUtc);
  const offset = offsetMinutesAt(wallAsUtc - firstGuess * 60_000);
  const sign = offset < 0 ? "-" : "+";
  const absolute = Math.abs(offset);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:00:00${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/**
 * The month before the reference month (#200), bounded the way the backend
 * bounds a month: from 00:00 on its first day to 23:00 on its last, both
 * inclusive, in the app's time zone.
 *
 * Derived from the reference month's start alone -- never from the device
 * clock or the device's time zone -- so the comparison is always against the
 * month the server resolved, whatever day and wherever it is read.
 */
export function previousMonthOf(referenceStart: string): ReferencePeriod {
  const reference = wallTimeAt(Date.parse(referenceStart));
  const year = reference.month === 1 ? reference.year - 1 : reference.year;
  const month = reference.month === 1 ? 12 : reference.month - 1;
  // Day 0 of the following month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    startDate: zonedIso({ year, month, day: 1, hour: 0 }),
    endDate: zonedIso({ year, month, day: lastDay, hour: LAST_HOUR_OF_DAY }),
  };
}
