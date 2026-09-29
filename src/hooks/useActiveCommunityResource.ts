import { useGetCommunityById } from "../api/communities/communities";
import type { CommunityResponse } from "../api/models";
import { useActiveCommunity } from "../context/community.context";

/**
 * The community the user is currently working in, as a resource.
 *
 * useActiveCommunityCapabilities answers one question about it; this hands over
 * the whole thing, which is what the actions layer's `forCommunity(community)`
 * needs. Same endpoint and same query key as that hook, so React Query serves
 * both from a single fetch -- the one the side menu already makes on every
 * authenticated page.
 *
 * `undefined` while there is no active community or the request has not
 * settled. That is deliberate and is what the actions layer reads as "not yet
 * known": `forCommunity(undefined)` reports pending and hands back no actions,
 * so a control cannot be rendered before the answer arrives.
 */
export function useActiveCommunityResource(): CommunityResponse | undefined {
  const activeCommunityId = useActiveCommunity();
  const { data } = useGetCommunityById(activeCommunityId ?? "", {
    query: { enabled: !!activeCommunityId },
  });
  return activeCommunityId ? data : undefined;
}
