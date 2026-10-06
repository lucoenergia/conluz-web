import type { CurrentUserResponse } from "../api/models";

/**
 * Where to send somebody once they are logged in.
 *
 * Membership wins: an administrator who also belongs to a community lands on
 * the community's home, because that is where the work is; /home then picks
 * the caller's view (#199). Only somebody with no
 * membership at all is sent to the platform, and only if they may administer
 * it -- read from the capability rather than the platform flag, so this agrees
 * with the guard on /platform instead of approximating it.
 */
export function resolveLandingRoute(user: CurrentUserResponse): string {
  if (Object.keys(user.memberships ?? {}).length > 0) return '/home';
  if (user.platformCapabilities?.canAdministerPlatform === true) return '/platform';
  return '/no-community';
}

export const CHANGE_PASSWORD_ROUTE = "/change-password";

/**
 * Where to send a caller who must change their password first, or `null` when
 * they may stay where they are (#196).
 *
 * While `mustChangePassword` is true, every authenticated route leads to the
 * change-password page. Logging out stays possible: it lives in the header,
 * which the redirect leaves in place. An unknown user is never redirected --
 * "not yet known" is not "yes".
 */
export function resolveForcedPasswordChangeTarget(
  user: CurrentUserResponse | null,
  pathname: string,
): string | null {
  if (user?.mustChangePassword !== true) return null;
  return pathname === CHANGE_PASSWORD_ROUTE ? null : CHANGE_PASSWORD_ROUTE;
}

/**
 * What a page reads and writes, as stated to the user by the scope context
 * surface (side-menu header or context strip).
 *
 * - `community`: the page's data belongs to the active community.
 * - `platform`: the page manages the platform and ignores the active community.
 * - `personal`: the page affects only the logged user's own data.
 * - `none`: there is deliberately nothing to state (a user with no community).
 * - `unknown`: the route is not classified. No surface is rendered for it: a
 *   surface whose job is to be trusted must never guess.
 */
export type PageScope = "community" | "platform" | "personal" | "none" | "unknown";

const PAGE_SCOPES: ReadonlyArray<{ prefix: string; scope: Exclude<PageScope, "unknown"> }> = [
  { prefix: "/home", scope: "community" },
  { prefix: "/production", scope: "community" },
  { prefix: "/supply-points", scope: "community" },
  { prefix: "/members", scope: "community" },
  { prefix: "/integrations", scope: "community" },
  { prefix: "/platform", scope: "platform" },
  { prefix: "/communities", scope: "platform" },
  { prefix: "/users", scope: "platform" },
  { prefix: "/profile", scope: "personal" },
  { prefix: "/change-password", scope: "personal" },
  { prefix: "/contact", scope: "personal" },
  { prefix: "/no-community", scope: "none" },
];

export function resolvePageScope(pathname: string): PageScope {
  if (pathname === "/") return "community";
  const match = PAGE_SCOPES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match?.scope ?? "unknown";
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
