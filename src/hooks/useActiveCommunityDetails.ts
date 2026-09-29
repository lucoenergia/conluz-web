import { useQueryClient } from "@tanstack/react-query";
import { useGetAllCommunities } from "../api/communities/communities";
import { useActiveCommunity, useActiveCommunityDispatch } from "../context/community.context";
import { useLoggedUser } from "../context/logged-user.context";
import type { CommunityResponse } from "../api/models";

export interface ActiveCommunityDetails {
  /** The active community id, or null when none is selected. */
  activeCommunityId: string | null;
  /** The active community, once the community list has loaded. */
  activeCommunity: CommunityResponse | undefined;
  /** The communities the logged user belongs to. */
  communities: CommunityResponse[];
  /** Number of memberships, known before the community list loads. */
  membershipCount: number;
  /** Makes `communityId` the active community. A no-op when it already is. */
  select: (communityId: string) => void;
}

export function useActiveCommunityDetails(): ActiveCommunityDetails {
  const loggedUser = useLoggedUser();
  const activeCommunityId = useActiveCommunity();
  const setActiveCommunity = useActiveCommunityDispatch();
  const queryClient = useQueryClient();

  const communityIds = Object.keys(loggedUser?.memberships ?? {});

  const { data: allCommunities = [] } = useGetAllCommunities({
    query: { enabled: communityIds.length >= 1 },
  });

  const communities = allCommunities.filter((community) => community.id && communityIds.includes(community.id));
  const activeCommunity = communities.find((community) => community.id === activeCommunityId);

  const select = (communityId: string) => {
    if (communityId === activeCommunityId) return;
    setActiveCommunity(communityId);
    queryClient.invalidateQueries();
  };

  return {
    activeCommunityId,
    activeCommunity,
    communities,
    membershipCount: communityIds.length,
    select,
  };
}
