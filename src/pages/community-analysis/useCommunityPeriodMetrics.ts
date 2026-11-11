import { useGetCommunityEnergyMetrics } from "../../api/communities/communities";
import type { CommunityEnergyMetricsResponse } from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";
import { useHistoricalPeriod } from "../../components/period/HistoricalPeriodContext";

export type CommunityPeriodMetricsState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; metrics: CommunityEnergyMetricsResponse };

/**
 * The active community's energy metrics over the selected period
 * (UI-CAN-003): every figure on the page comes from this one response. Asked
 * by the period's explicit bounds, and not at all while the period or the
 * community is unknown.
 */
export function useCommunityPeriodMetrics(): CommunityPeriodMetricsState {
  const period = useHistoricalPeriod();
  const communityId = useActiveCommunity();
  const bounds = period ? { startDate: period.startDate, endDate: period.endDate } : {};

  const query = useGetCommunityEnergyMetrics(communityId ?? "", bounds, { query: { enabled: !!period && !!communityId } });

  if (query.isError) return { status: "error", retry: () => void query.refetch() };
  if (!query.isSuccess) return { status: "loading" };
  return { status: "ready", metrics: query.data };
}
