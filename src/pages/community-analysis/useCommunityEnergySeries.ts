import {
  useGetCommunityDailyEnergySeries,
  useGetCommunityHourlyEnergySeries,
  useGetCommunityMonthlyEnergySeries,
} from "../../api/communities/communities";
import { useActiveCommunity } from "../../context/community.context";
import { useHistoricalPeriod } from "../../components/period/HistoricalPeriodContext";
import type { CommunitySeries } from "./communitySeries";

export type CommunityEnergySeriesState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; series: CommunitySeries };

/**
 * The active community's energy series over the selected period (UI-CAN-007),
 * bucket by bucket, for the evolution chart. The period's granularity picks
 * hourly, daily or monthly buckets, and the request carries the period's
 * explicit bounds. Only the one query for that granularity runs, and none
 * while the period or the community is unknown.
 */
export function useCommunityEnergySeries(): CommunityEnergySeriesState {
  const period = useHistoricalPeriod();
  const communityId = useActiveCommunity();
  const bounds = period ? { startDate: period.startDate, endDate: period.endDate } : { startDate: "", endDate: "" };
  const known = !!communityId;

  const hourly = useGetCommunityHourlyEnergySeries(communityId ?? "", bounds, {
    query: { enabled: known && period?.granularity === "hourly" },
  });
  const daily = useGetCommunityDailyEnergySeries(communityId ?? "", bounds, {
    query: { enabled: known && period?.granularity === "daily" },
  });
  const monthly = useGetCommunityMonthlyEnergySeries(communityId ?? "", bounds, {
    query: { enabled: known && period?.granularity === "monthly" },
  });

  if (!period) return { status: "loading" };
  switch (period.granularity) {
    case "hourly":
      return stateOf(hourly, (buckets) => ({ kind: "hourly", buckets }));
    case "daily":
      return stateOf(daily, (buckets) => ({ kind: "daily", buckets }));
    case "monthly":
      return stateOf(monthly, (buckets) => ({ kind: "monthly", buckets }));
  }
}

interface SeriesQuery<T> {
  isError: boolean;
  isSuccess: boolean;
  data: T | undefined;
  refetch: () => unknown;
}

function stateOf<T>(query: SeriesQuery<T>, tag: (data: T) => CommunitySeries): CommunityEnergySeriesState {
  if (query.isError) return { status: "error", retry: () => void query.refetch() };
  if (!query.isSuccess || query.data === undefined) return { status: "loading" };
  return { status: "ready", series: tag(query.data) };
}
