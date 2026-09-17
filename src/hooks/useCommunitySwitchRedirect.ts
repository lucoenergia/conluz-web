import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useActiveCommunity } from "../context/community.context";
import { resolveCommunityScopedTarget } from "../utils/routes";

/**
 * The route to leave for, when the active community has just changed underneath
 * a page pinned to the previous one -- otherwise `null`.
 *
 * Deliberately decided during render rather than in an effect. An effect runs
 * after commit, so the routed page would mount once against the new community
 * with the old entity id still in the URL and fire a round of requests for a
 * plant or supply the user has just navigated away from. Returning the target
 * during render lets the caller render <Navigate> *instead of* the page, so it
 * never mounts at all.
 *
 * The `null -> id` transition is not a switch: it is the provider resolving the
 * persisted or single-membership community on first load. Redirecting there
 * would break every deep link and bookmark, so it is explicitly excluded. A
 * foreign entity reached that way is caught by the per-page community guard
 * instead (see isPlantOutsideActiveCommunity).
 *
 * Must be called from inside the router -- CommunityProvider itself sits
 * outside BrowserRouter in main.tsx and cannot navigate.
 */
export function useCommunitySwitchRedirect(): string | null {
  const activeCommunityId = useActiveCommunity();
  const { pathname, search } = useLocation();

  const [communitySnapshot, setCommunitySnapshot] = useState(activeCommunityId);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  if (communitySnapshot !== activeCommunityId) {
    setCommunitySnapshot(activeCommunityId);
    setPendingRedirect(
      communitySnapshot === null ? null : resolveCommunityScopedTarget(pathname, search),
    );
  }

  // Consumed once the navigation has landed. Keyed on the location rather than
  // on a timer or a flag: this fires only after <Navigate> has committed, which
  // is exactly when the target stops being pending.
  useEffect(() => {
    setPendingRedirect(null);
  }, [pathname, search]);

  return pendingRedirect;
}
