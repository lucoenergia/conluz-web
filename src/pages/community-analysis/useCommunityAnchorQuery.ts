import { useGetCommunityEnergyMetrics } from "../../api/communities/communities";
import { GetCommunityEnergyMetricsPeriod } from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";

const LATEST_COMMUNITY_MONTH = { period: GetCommunityEnergyMetricsPeriod.LATEST_PUBLISHED_MONTH };

/**
 * The active community's energy metrics over its latest published month
 * (UI-CAN-002): the period's anchor, read with `readMonthAnchor`, and the
 * header's plants and their peak and nominal power, which do not depend on the period.
 * Nothing is asked before the community is known.
 */
export function useCommunityAnchorQuery() {
  const communityId = useActiveCommunity();
  return useGetCommunityEnergyMetrics(communityId ?? "", LATEST_COMMUNITY_MONTH, { query: { enabled: !!communityId } });
}
