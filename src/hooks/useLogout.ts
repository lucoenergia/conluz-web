import { useNavigate } from "react-router";
import { useEndSession } from "./useEndSession";
import { useBoundedRevoke } from "./useBoundedRevoke";

export { LOGOUT_TIMEOUT_MS } from "./useBoundedRevoke";

/**
 * The logout in progress, shared by every entry point -- the profile menu, the
 * minimal header shown while a password change is required, the auth error
 * boundary. Module scope rather than per hook, so a second trigger anywhere
 * joins the first instead of sending another request.
 */
let logoutInFlight: Promise<void> | null = null;

/**
 * Shared logout routine used by every logout entry point that has a router.
 *
 * Asks the backend to revoke the token first (#213), and ends the session only
 * once it has answered, failed, or not answered within `LOGOUT_TIMEOUT_MS`
 * (`useBoundedRevoke`). Whatever the backend does, the caller lands on the
 * login page with no session -- a logout that a backend failure could refuse
 * would strand them.
 *
 * Clearing the React Query cache is what empties the signed-in user: the user
 * IS the `getCurrentUser` query now (#203), so nothing else has to be reset --
 * and nothing else can be. The clear is also still what stops the previous
 * user's response, whose query key is user-independent, from leaking into the
 * next session and driving the landing redirect off the wrong memberships.
 */
export function useLogout() {
  const endSession = useEndSession();
  const navigate = useNavigate();
  const revoke = useBoundedRevoke();

  return (): Promise<void> => {
    if (logoutInFlight) return logoutInFlight;

    logoutInFlight = revoke().then(() => {
      logoutInFlight = null;
      // "logout", not "expired": the user asked. Claiming an expiry on the
      // login page would be a lie on every deliberate logout.
      endSession("logout");
      navigate("/login");
    });
    return logoutInFlight;
  };
}
