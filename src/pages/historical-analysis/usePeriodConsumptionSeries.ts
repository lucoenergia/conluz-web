import { useGetMembershipDailyConsumption, useGetMembershipMonthlyConsumption } from "../../api/memberships/memberships";
import { useGetSupplyDailyConsumption, useGetSupplyMonthlyConsumption } from "../../api/supplies/supplies";
import type {
  MembershipDailyConsumptionBucketResponse,
  MembershipMonthlyConsumptionBucketResponse,
  SupplyConsumptionBucketResponse,
  SupplyResponse,
} from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";
import { useLoggedUser } from "../../context/logged-user.context";
import { useHistoricalPeriod } from "./HistoricalPeriodContext";

/** The buckets of the selected scope and granularity, tagged by the series they came from: each marks its states its own way. */
export type ConsumptionSeries =
  | { kind: "membershipDaily"; buckets: MembershipDailyConsumptionBucketResponse[] }
  | { kind: "membershipMonthly"; buckets: MembershipMonthlyConsumptionBucketResponse[] }
  | { kind: "supplyDaily"; buckets: SupplyConsumptionBucketResponse[] }
  | { kind: "supplyMonthly"; buckets: SupplyConsumptionBucketResponse[] };

export type PeriodConsumptionSeriesState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; series: ConsumptionSeries };

/**
 * The consumption series of the selected period and scope (#250), bucket by
 * bucket, for the evolution charts.
 *
 * "Todos mis puntos" asks the caller's membership in the active community
 * (the daily series is lucoenergia/conluz#410); a single supply asks that
 * supply alone. The period's granularity picks daily or monthly buckets, and
 * the request carries the period's explicit bounds, so the buckets cover the
 * period the totals do. Only the one query for the selected scope and
 * granularity runs, and none runs while the period is unknown.
 */
export function usePeriodConsumptionSeries(selected: SupplyResponse | null): PeriodConsumptionSeriesState {
  const period = useHistoricalPeriod();
  const communityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;
  const bounds = period ? { startDate: period.startDate, endDate: period.endDate } : { startDate: "", endDate: "" };
  const daily = period?.granularity === "daily";
  const monthly = period?.granularity === "monthly";
  const membership = selected === null && !!communityId && !!userId;

  const membershipDaily = useGetMembershipDailyConsumption(communityId ?? "", userId ?? "", bounds, {
    query: { enabled: daily && membership },
  });
  const membershipMonthly = useGetMembershipMonthlyConsumption(communityId ?? "", userId ?? "", bounds, {
    query: { enabled: monthly && membership },
  });
  const supplyDaily = useGetSupplyDailyConsumption(selected?.id ?? "", bounds, {
    query: { enabled: daily && selected !== null },
  });
  const supplyMonthly = useGetSupplyMonthlyConsumption(selected?.id ?? "", bounds, {
    query: { enabled: monthly && selected !== null },
  });

  if (!period) return { status: "loading" };
  if (selected === null) {
    return period.granularity === "daily"
      ? stateOf(membershipDaily, (buckets) => ({ kind: "membershipDaily", buckets }))
      : stateOf(membershipMonthly, (buckets) => ({ kind: "membershipMonthly", buckets }));
  }
  return period.granularity === "daily"
    ? stateOf(supplyDaily, (buckets) => ({ kind: "supplyDaily", buckets }))
    : stateOf(supplyMonthly, (buckets) => ({ kind: "supplyMonthly", buckets }));
}

interface SeriesQuery<T> {
  isError: boolean;
  isSuccess: boolean;
  data: T | undefined;
  refetch: () => unknown;
}

function stateOf<T>(query: SeriesQuery<T>, tag: (data: T) => ConsumptionSeries): PeriodConsumptionSeriesState {
  if (query.isError) return { status: "error", retry: () => void query.refetch() };
  if (!query.isSuccess || query.data === undefined) return { status: "loading" };
  return { status: "ready", series: tag(query.data) };
}
