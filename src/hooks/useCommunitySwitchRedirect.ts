import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useActiveCommunity } from "../context/community.context";
import { useLoggedUser } from "../context/logged-user.context";
import { resolveCommunityScopedTarget, resolvePageScope } from "../utils/routes";

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
 * A move the caller did not make -- the previous community is no longer one of
 * their memberships, so the provider chose another (#237) -- sends any
 * community page to "/", which lands them on the new community's home. Staying
 * on the same page would let them carry on working without noticing the
 * community changed under them. Pages that are not about a community stay.
 *
 * Must be called from inside the router -- CommunityProvider itself sits
 * outside BrowserRouter in main.tsx and cannot navigate.
 */
export function useCommunitySwitchRedirect(): string | null {
  const activeCommunityId = useActiveCommunity();
  const memberships = useLoggedUser()?.memberships;
  const { pathname, search } = useLocation();

  const [communitySnapshot, setCommunitySnapshot] = useState(activeCommunityId);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  if (communitySnapshot !== activeCommunityId) {
    setCommunitySnapshot(activeCommunityId);
    setPendingRedirect(
      communitySnapshot === null
        ? null
        : targetAfterMove(communitySnapshot, activeCommunityId, memberships, pathname, search),
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

function targetAfterMove(
  previous: string,
  next: string | null,
  memberships: Record<string, unknown> | undefined,
  pathname: string,
  search: string,
): string | null {
  // To no community at all, the caller has no membership left: the guards and
  // the landing deal with that, as before.
  const lostPrevious = next !== null && memberships !== undefined && !(previous in memberships);
  if (lostPrevious && resolvePageScope(pathname) === "community") {
    return pathname === "/" ? null : "/";
  }
  return resolveCommunityScopedTarget(pathname, search);
}
