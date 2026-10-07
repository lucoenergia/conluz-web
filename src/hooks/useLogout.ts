import { useNavigate } from "react-router";
import { useEndSession } from "./useEndSession";
import { useSessionActions } from "./actions";

/**
 * How long logging out waits for the backend to revoke the token before ending
 * the session anyway. Long enough for a slow but working backend, short enough
 * that somebody who clicked "Salir" is not left looking at the page they asked
 * to leave.
 */
export const LOGOUT_TIMEOUT_MS = 4000;

/**
 * The logout in progress, shared by every entry point -- the profile menu, the
 * minimal header shown while a password change is required, the auth error
 * boundary. Module scope rather than per hook, so a second trigger anywhere
 * joins the first instead of sending another request.
 */
let logoutInFlight: Promise<void> | null = null;

function settleWithin(promise: Promise<unknown>, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    void promise.finally(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Shared logout routine used by every logout entry point that has a router.
 *
 * Asks the backend to revoke the token first (#213), and ends the session only
 * once it has answered, failed, or not answered within `LOGOUT_TIMEOUT_MS`.
 * The order matters: the bearer token is attached from the session, so clearing
 * it first would send the request without one. Whatever the backend does, the
 * caller lands on the login page with no session -- a logout that a backend
 * failure could refuse would strand them. A timed-out request keeps running and
 * may still revoke the token; if it does not, the token outlives the browser
 * session until it expires.
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
  const { logout } = useSessionActions().actions;

  return (): Promise<void> => {
    if (logoutInFlight) return logoutInFlight;

    const revoked = logout.run();
    logoutInFlight = settleWithin(revoked, LOGOUT_TIMEOUT_MS).then(() => {
      logoutInFlight = null;
      // "logout", not "expired": the user asked. Claiming an expiry on the
      // login page would be a lie on every deliberate logout.
      endSession("logout");
      navigate("/login");
    });
    return logoutInFlight;
  };
}
