import { useGetMembershipEnergyMetrics } from "../../../api/memberships/memberships";
import type { MembershipEnergyMetricsResponse } from "../../../api/models";
import { useActiveCommunity } from "../../../context/community.context";
import { useLoggedUser } from "../../../context/logged-user.context";
import { previousMonthOf } from "./previousMonth";
import type { ReferencePeriod } from "./useMemberEnergyMetrics";

export interface PreviousMonthEnergyMetrics {
  metrics: MembershipEnergyMetricsResponse | undefined;
  /** The bounds requested: the month before the reference month. */
  previousPeriod: ReferencePeriod;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * The caller's aggregated energy in the month before the reference month
 * (#200), for the comparison. One extra request for one month, with explicit
 * bounds derived from the month the server resolved -- so it has its own query
 * key and never touches the reference month's read.
 */
export function usePreviousMonthEnergyMetrics(referencePeriod: ReferencePeriod): PreviousMonthEnergyMetrics {
  const communityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;
  const previousPeriod = previousMonthOf(referencePeriod.startDate);

  const query = useGetMembershipEnergyMetrics(communityId ?? "", userId ?? "", previousPeriod, {
    query: { enabled: !!communityId && !!userId },
  });

  return {
    metrics: query.data,
    previousPeriod,
    isLoading: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
