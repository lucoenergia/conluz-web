import { monthBefore } from "./monthBounds";
import type { ReferencePeriod } from "./useMemberEnergyMetrics";

/** The reference month and the eleven before it. */
const MONTHS_IN_SERIES = 12;

/**
 * The bounds of the twelve-month series (#201): from 00:00 on the first day of
 * the month eleven months before the reference month to the reference month's
 * own end, exactly as the server resolved it.
 *
 * The backend emits every month whose local midnight on day 1 falls inside the
 * inclusive bounds, so these select exactly the twelve months ending at the
 * reference month. Counted back from the reference month alone, never from the
 * device clock.
 */
export function twelveMonthRangeOf(referencePeriod: ReferencePeriod): ReferencePeriod {
  return {
    startDate: monthBefore(referencePeriod.startDate, MONTHS_IN_SERIES - 1).startDate,
    endDate: referencePeriod.endDate,
  };
}
