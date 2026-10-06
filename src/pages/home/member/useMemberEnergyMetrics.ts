import { useGetMembershipEnergyMetrics } from "../../../api/memberships/memberships";
import {
  GetMembershipEnergyMetricsPeriod,
  type GetMembershipEnergyMetricsParams,
  type MembershipEnergyMetricsResponse,
} from "../../../api/models";
import { useActiveCommunity } from "../../../context/community.context";
import { useLoggedUser } from "../../../context/logged-user.context";

/** The month the member home is about, as the server resolves it. */
export interface ReferencePeriod {
  startDate: string;
  endDate: string;
}

const REFERENCE_MONTH: GetMembershipEnergyMetricsParams = {
  period: GetMembershipEnergyMetricsPeriod.LATEST_PUBLISHED_MONTH,
};

export interface MemberEnergyMetrics {
  metrics: MembershipEnergyMetricsResponse | undefined;
  /**
   * The bounds of the reference month, or null when none resolves yet. Every
   * block that compares with or counts back from that month takes its period
   * from here -- never from the device clock, and without a second request.
   */
  referencePeriod: ReferencePeriod | null;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * The caller's aggregated energy in the active community, for the latest month
 * the distributor has published (#199). Which month that is is a domain rule,
 * so the server resolves it; the client never guesses it.
 *
 * Gated on both the active community and the signed-in user, since the path
 * needs both.
 */
export function useMemberEnergyMetrics(): MemberEnergyMetrics {
  const communityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;

  const query = useGetMembershipEnergyMetrics(communityId ?? "", userId ?? "", REFERENCE_MONTH, {
    query: { enabled: !!communityId && !!userId },
  });

  const period = query.data?.period;
  const referencePeriod =
    period?.startDate && period.endDate ? { startDate: period.startDate, endDate: period.endDate } : null;

  return {
    metrics: query.data,
    referencePeriod,
    isLoading: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
