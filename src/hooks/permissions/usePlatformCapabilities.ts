import type { PlatformCapabilitiesResponse } from "../../api/models";
import { useLoggedUser } from "../../context/logged-user.context";
import { decide, PENDING, type CapabilityOutcome } from "./capabilityOutcome";

/**
 * What the caller may do on the platform as a whole, independently of any one
 * resource. Read from the current user, which GET /users/current already
 * carries, so this costs no request and cannot fail on its own.
 *
 * It can still be `pending`: the user is fetched once per session and the
 * context holds null until it lands. AuthenticatedLayout renders a spinner
 * instead of the Outlet while that is true, so a route guard never observes it
 * -- but the state is reported honestly rather than assumed away, because
 * anything rendered outside that layout would observe it.
 *
 * The capability name is a key of the generated type, so a typo does not
 * compile.
 */
export function usePlatformCapabilities(
  capability: keyof PlatformCapabilitiesResponse,
): CapabilityOutcome {
  const loggedUser = useLoggedUser();

  if (loggedUser === null) return PENDING;
  return decide(loggedUser.platformCapabilities, capability);
}
