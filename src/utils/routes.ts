import type { CurrentUserResponse } from "../api/models";

/**
 * Where to send somebody once they are logged in.
 *
 * Membership wins: an administrator who also belongs to a community lands in
 * the community, because that is where the work is. Only somebody with no
 * membership at all is sent to the platform, and only if they may administer
 * it -- read from the capability rather than the platform flag, so this agrees
 * with the guard on /platform instead of approximating it.
 */
export function resolveLandingRoute(user: CurrentUserResponse): string {
  if (Object.keys(user.memberships ?? {}).length > 0) return '/';
  if (user.platformCapabilities?.canAdministerPlatform === true) return '/platform';
  return '/no-community';
}

/**
 * Sections whose detail routes carry an entity id in the URL. The endpoints
 * behind them are entity-scoped -- /api/v1/plants/{plantId}/...,
 * /api/v1/supplies/{supplyId}/... -- so they carry no community at all and
 * their React Query keys cannot change when the active community does.
 * Refetching one after a switch returns the same foreign entity again.
 */
const ENTITY_SCOPED_SECTIONS = ["/production", "/supply-points"] as const;

/**
 * Segments that sit where an entity id would but name an action instead.
 * "/production/new" is a creation form, not somebody else's plant.
 */
const NON_ENTITY_SEGMENTS = new Set(["new"]);

/**
 * Where to send someone who switches community while standing on a page
 * pinned to the previous community's data, or `null` when the current
 * location is already community-agnostic and can stay put.
 *
 * This is about the *switch*, not about access: the backend verifies
 * membership on every one of these endpoints, so nothing here is an
 * authorisation boundary. What it prevents is a screen that keeps rendering --
 * and keeps writing to -- a community the user has just navigated away from.
 */
export function resolveCommunityScopedTarget(pathname: string, search: string): string | null {
  for (const section of ENTITY_SCOPED_SECTIONS) {
    if (!pathname.startsWith(`${section}/`)) continue;
    const [entitySegment] = pathname.slice(section.length + 1).split("/");
    if (!entitySegment || NON_ENTITY_SEGMENTS.has(entitySegment)) return null;
    return section;
  }

  // The list itself is community-scoped and re-keys on its own, except on the
  // ?personId= branch: that one reads /supplies/user/{id}, which is scoped to a
  // user rather than a community and would keep listing the previous
  // community's member under the new community's name.
  if (pathname === "/supply-points" && new URLSearchParams(search).has("personId")) {
    return "/supply-points";
  }

  return null;
}
