import { useGetUserById } from "../../api/users/users";
import type { UserCapabilitiesResponse } from "../../api/models";
import { DENIED, outcomeFromQuery, type CapabilityOutcome } from "./capabilityOutcome";

/**
 * What the caller may do with one user account, read from the account itself.
 *
 * A user is not community-scoped, so there is no wrapper to go through and
 * nothing to compare against the active community: the backend answers for the
 * caller, and a user they may not see comes back 403 or 404, which
 * `outcomeFromQuery` folds into a denial. The request is the same one the edit
 * page behind the guard makes, so React Query serves both from one fetch.
 *
 * A screen that already holds a `UserResponse` must not call this -- the row
 * carries its own capabilities, and `useUserActions().forUser(user)` reads them
 * without a request. This exists for the one case that has no row yet: a route
 * guard, which knows only the id in the URL.
 *
 * `enabled` exists for callers that ask conditionally -- a route guard resolves
 * every scope on every render to keep the hook order stable, and must not fire
 * a user request on a route that has no user.
 */
export function useUserCapabilities(
  userId: string | undefined,
  capability: keyof UserCapabilitiesResponse,
  { enabled = true }: { enabled?: boolean } = {},
): CapabilityOutcome {
  const query = useGetUserById(enabled && userId ? userId : "", {
    query: { enabled: enabled && !!userId },
  });

  if (!enabled || !userId) return DENIED;

  return outcomeFromQuery(query, (user) => user.capabilities, capability);
}
