import { wallTimeAt, zonedIso } from "../../../utils/zonedTime";
import type { ReferencePeriod } from "./useMemberEnergyMetrics";

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
