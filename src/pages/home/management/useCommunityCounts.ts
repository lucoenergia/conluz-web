import { useGetMemberships } from "../../../api/memberships/memberships";
import { useGetAllSupplies } from "../../../api/supplies/supplies";
import { useActiveCommunity } from "../../../context/community.context";

export interface CommunityCount {
  /** `undefined` until read, and whenever the read failed: never a stand-in 0. */
  count: number | undefined;
  isError: boolean;
  retry: () => void;
}

/**
 * The enabled members of the active community.
 *
 * GET /communities/{communityId}/memberships is not paged and carries no
 * count, so this reads the whole roster -- one request, shared with the
 * Members page -- and counts it here. The figure is right only while the full
 * roster arrives.
 */
export function useMemberCount(): CommunityCount {
  const communityId = useActiveCommunity();
  const { data, isError, refetch } = useGetMemberships(communityId ?? "", { query: { enabled: !!communityId } });
  return {
    count: isError ? undefined : data?.filter((membership) => membership.enabled).length,
    isError,
    retry: () => void refetch(),
  };
}

/**
 * The supply points of the active community: the total of a one-row page, so
 * the count costs one row rather than the whole list. A community admin is
 * answered with every supply of the community.
 */
export function useSupplyPointCount(): CommunityCount {
  const communityId = useActiveCommunity();
  const { data, isError, refetch } = useGetAllSupplies(
    communityId ?? "",
    { size: 1 },
    { query: { enabled: !!communityId } },
  );
  return { count: isError ? undefined : data?.totalElements, isError, retry: () => void refetch() };
}
