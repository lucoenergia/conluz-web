import type { PlantInverterPowerPointResponse } from "../../../api/models";
import { addDays } from "../../../components/period/historicalPeriod";
import { formatTimeOfDay } from "../../../utils/formatCalendarDate";
import { wallTimeAt, zonedIso } from "../../../utils/zonedTime";

/**
 * Today's inverter power curve on the instant line (#406, as UI-HIS-028 lays
 * out an hourly axis): the axis runs from the instant of today's local
 * midnight to the instant of tomorrow's, in the app's time zone, so it lasts
 * 23, 24 or 25 hours, and every point sits at its own instant. Wall-clock
 * minutes would run backwards through the hour the clocks go back.
 */

/** A stretch with no data, between two instants. */
export interface CurveGap {
  from: number;
  to: number;
}

export interface InverterCurve {
  /** The instant today's local midnight falls on. */
  dayStart: number;
  /** The instant tomorrow's local midnight falls on. */
  dayEnd: number;
  /** Each point at its instant, up to now; null breaks the line. */
  points: [x: number, y: number | null][];
  /** Where the line is broken, each from the snapshot before to the one after. */
  gaps: CurveGap[];
  /** Now's instant: the "Ahora" mark. */
  now: number;
}

/** The local day an instant falls on, as the instants its midnights fall on. */
export function localDayBounds(instant: number): { dayStart: number; dayEnd: number } {
  const { year, month, day } = wallTimeAt(instant);
  const tomorrow = addDays({ year, month, day }, 1);
  return {
    dayStart: Date.parse(zonedIso({ year, month, day, hour: 0 })),
    dayEnd: Date.parse(zonedIso({ ...tomorrow, hour: 0 })),
  };
}

/**
 * The curve as drawn at `now`. Nothing is drawn after now. A null power is a
 * gap in the snapshots, never production: it stays null, which breaks the
 * line, and the stretch it covers, from the snapshot before it, is a gap.
 * Consecutive nulls make one gap.
 */
export function inverterCurve(powerCurve: readonly PlantInverterPowerPointResponse[], now: number): InverterCurve {
  const { dayStart, dayEnd } = localDayBounds(now);
  const drawn = powerCurve
    .map(({ endsAt, powerKW }) => ({ x: Date.parse(endsAt), y: powerKW }))
    .filter(({ x }) => x >= dayStart && x <= now);

  const gaps: CurveGap[] = [];
  drawn.forEach(({ x, y }, index) => {
    if (y !== null) return;
    const previous = index > 0 ? drawn[index - 1] : null;
    if (previous && previous.y === null) {
      gaps[gaps.length - 1].to = x;
      return;
    }
    gaps.push({ from: previous ? previous.x : dayStart, to: x });
  });

  return { dayStart, dayEnd, points: drawn.map(({ x, y }) => [x, y]), gaps, now };
}

/** "14:05" in the app's time zone; the end of the day reads "24:00", not the next day's "00:00". */
export function axisTime(instant: number, dayEnd: number): string {
  return instant >= dayEnd ? "24:00" : formatTimeOfDay(new Date(instant).toISOString());
}

/** "de 10:20 a 11:05", "de 10:20 a 11:05 y de 14:00 a 14:30". */
export function gapsPhrase(gaps: readonly CurveGap[], dayEnd: number): string {
  const phrases = gaps.map(({ from, to }) => `de ${axisTime(from, dayEnd)} a ${axisTime(to, dayEnd)}`);
  if (phrases.length <= 1) return phrases.join("");
  return `${phrases.slice(0, -1).join(", ")} y ${phrases.at(-1)}`;
}
