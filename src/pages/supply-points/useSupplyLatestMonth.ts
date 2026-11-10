import { useGetSupplyEnergyMetrics } from "../../api/supplies/supplies";
import { GetSupplyEnergyMetricsPeriod, type SupplyEnergyMetricsResponse, type SupplyResponse } from "../../api/models";
import { outcomeFromResource } from "../../hooks/permissions";
import { anchorFromPeriodStart, type CalendarMonth } from "../../components/period/historicalPeriod";

export type SupplyLatestMonth =
  /** The supply does not open its figures to this caller, so nothing is asked. */
  | { status: "unreadable" }
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  /** Nothing published yet for this supply. */
  | { status: "none" }
  | { status: "ready"; anchor: CalendarMonth; metrics: SupplyEnergyMetricsResponse };

const LATEST_PUBLISHED_MONTH = { period: GetSupplyEnergyMetricsPeriod.LATEST_PUBLISHED_MONTH };

/**
 * The supply's latest published month, as the server resolves it (#252): the
 * same request, and so the same cached answer, as the historical analysis
 * page's anchor for this supply. The month is never derived from the device
 * clock, nor taken to be "the previous month".
 *
 * Fires only for a supply useSupplyInActiveCommunity has admitted, so a supply
 * of another community never reaches it, and only when the supply's canRead
 * opens its figures to the caller. Null bounds mean nothing is published yet.
 */
export function useSupplyLatestMonth(supply: SupplyResponse | undefined): SupplyLatestMonth {
  const readable = outcomeFromResource(supply?.capabilities, "canRead").state === "allowed";
  const query = useGetSupplyEnergyMetrics(supply?.id ?? "", LATEST_PUBLISHED_MONTH, {
    query: { enabled: !!supply && readable },
  });

  if (supply && !readable) return { status: "unreadable" };
  if (query.isError) return { status: "error", retry: () => void query.refetch() };
  if (!query.isSuccess) return { status: "loading" };
  const { startDate } = query.data.period;
  return startDate ? { status: "ready", anchor: anchorFromPeriodStart(startDate), metrics: query.data } : { status: "none" };
}
