import { useGetMembershipMonthlyConsumption } from "../../../api/memberships/memberships";
import type { MembershipMonthlyConsumptionBucketResponse } from "../../../api/models";
import { useActiveCommunity } from "../../../context/community.context";
import { useLoggedUser } from "../../../context/logged-user.context";
import { twelveMonthRangeOf } from "./twelveMonthRange";
import type { ReferencePeriod } from "./useMemberEnergyMetrics";

export interface TwelveMonthSeries {
  buckets: MembershipMonthlyConsumptionBucketResponse[] | undefined;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * The caller's monthly totals in the active community over the twelve months
 * ending at the reference month (#201). Its bounds are derived from the month
 * the server resolved, so it has its own query key and never touches the
 * reference month's read.
 */
export function useTwelveMonthSeries(referencePeriod: ReferencePeriod): TwelveMonthSeries {
  const communityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;

  const query = useGetMembershipMonthlyConsumption(communityId ?? "", userId ?? "", twelveMonthRangeOf(referencePeriod), {
    query: { enabled: !!communityId && !!userId },
  });

  return {
    buckets: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
