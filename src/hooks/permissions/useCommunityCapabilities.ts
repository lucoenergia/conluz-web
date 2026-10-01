import { useGetCommunityById } from "../../api/communities/communities";
import type { CommunityCapabilitiesResponse } from "../../api/models";
import { DENIED, outcomeFromQuery, type CapabilityOutcome } from "./capabilityOutcome";

/**
 * What the caller may do in one named community, whichever one they are
 * currently working in.
 *
 * Deliberately not `useActiveCommunityCapabilities`. The two answer different
 * questions, and the communities administration screens are where that shows:
 * editing a community is reached by its id in the URL and gates on
 * `canUpdate`, a platform-wide decision, while the active community is the one
 * whose operational data the rest of the app reads. Asking the active one about
 * a community the caller is merely administering would answer about the wrong
 * resource -- or about none at all, since a platform admin has no membership.
 *
 * There is no active-community guard here for the same reason: this community
 * is the subject, not a foreign resource reached from another one. A community
 * the caller may not see comes back 403 or 404, which `outcomeFromQuery` folds
 * into a denial.
 *
 * Same endpoint and key as `useActiveCommunityCapabilities` and
 * `useActiveCommunityResource`, so when the id happens to be the active one
 * React Query serves all three from a single fetch.
 *
 * `enabled` exists for callers that ask conditionally -- a route guard resolves
 * every scope on every render to keep the hook order stable, and must not fire
 * a community request on a route that names none.
 */
export function useCommunityCapabilities(
  communityId: string | undefined,
  capability: keyof CommunityCapabilitiesResponse,
  { enabled = true }: { enabled?: boolean } = {},
): CapabilityOutcome {
  const query = useGetCommunityById(enabled && communityId ? communityId : "", {
    query: { enabled: enabled && !!communityId },
  });

  if (!enabled || !communityId) return DENIED;

  return outcomeFromQuery(query, (community) => community.capabilities, capability);
}
