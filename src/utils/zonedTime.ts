import { APP_TIME_ZONE } from "./formatCalendarDate";

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
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:00:00${offsetText(offset)}`;
}

/** "+02:00", "-05:00". */
function offsetText(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/**
 * An instant written as the app's time zone reads it, with the offset in
 * force at that instant: "2026-10-25T02:00:00+01:00". Unlike a wall time, an
 * instant names one hour even on the day the clocks go back, when 02:00
 * happens twice, so two instants never share this text.
 */
export function localIsoAt(instantMs: number): string {
  const { year, month, day, hour, minute, second } = wallTimeAt(instantMs);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${offsetText(offsetMinutesAt(instantMs))}`;
}
