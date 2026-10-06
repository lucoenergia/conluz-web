import { monthBefore } from "./monthBounds";
import type { ReferencePeriod } from "./useMemberEnergyMetrics";

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
  return monthBefore(referenceStart, 1);
}
