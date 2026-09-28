import { useGetCommunityById } from "../../api/communities/communities";
import type { CommunityCapabilitiesResponse } from "../../api/models";
import { useActiveCommunity, useIsActiveCommunityResolved } from "../../context/community.context";
import { DENIED, PENDING, outcomeFromQuery, type CapabilityOutcome } from "./capabilityOutcome";

/**
 * What the caller may do in the community they are currently working in.
 *
 * Read from GET /communities/{communityId} rather than from the community list
 * the selector happens to have fetched. The list is loaded by a header
 * component behind its own gate, so depending on it would tie authorisation to
 * whether a piece of UI is mounted, and a `.find()` that misses -- a membership
 * granted since the list was cached -- is indistinguishable from a denial. The
 * per-id key also re-fetches by itself when the community changes, which is
 * what lets a guard wait for the new community's answer instead of deciding on
 * the previous one's.
 *
 * No active community is a denial, not a wait: there is no community to hold a
 * capability, and a caller that waited would wait for one that is never coming.
 * But only once the selection has actually been made -- before that, null means
 * "not worked out yet" and the honest answer is `pending`.
 */
export function useActiveCommunityCapabilities(
  capability: keyof CommunityCapabilitiesResponse,
): CapabilityOutcome {
  const activeCommunityId = useActiveCommunity();
  const isResolved = useIsActiveCommunityResolved();

  const query = useGetCommunityById(activeCommunityId ?? "", {
    query: { enabled: !!activeCommunityId },
  });

  if (!isResolved) return PENDING;
  if (!activeCommunityId) return DENIED;

  return outcomeFromQuery(query, (community) => community.capabilities, capability);
}
