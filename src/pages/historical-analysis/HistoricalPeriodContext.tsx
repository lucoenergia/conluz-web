import { createContext, useContext } from "react";
import type { HistoricalPeriod } from "./historicalPeriod";

/**
 * The period the historical analysis page shows, for the blocks that fetch
 * its figures. Provided by HistoricalAnalysisPage around its content region.
 */
export const HistoricalPeriodContext = createContext<HistoricalPeriod | undefined>(undefined);

/**
 * The selected period, ready to request: `{ startDate, endDate, granularity,
 * label }`, half-open bounds in Europe/Madrid (#248).
 *
 * `undefined` until the latest published month of the selected scope has
 * resolved and the selection resolves to a period: while the anchor is
 * pending, after it failed, and when nothing is published. A block reading it
 * fetches nothing then.
 * A period it does return never starts in the future, never runs backwards,
 * never ends after the latest published month and never exceeds 24 months, so
 * the request cannot be refused with ENERGY_METRICS_PERIOD_START_IN_FUTURE,
 * ENERGY_METRICS_PERIOD_START_AFTER_END or ENERGY_METRICS_PERIOD_TOO_LONG.
 *
 * Bucket by `granularity`: "daily" is up to 62 calendar days, "monthly" whole
 * months, so the buckets and the totals cover the same period.
 */
export function useHistoricalPeriod(): HistoricalPeriod | undefined {
  return useContext(HistoricalPeriodContext);
}
