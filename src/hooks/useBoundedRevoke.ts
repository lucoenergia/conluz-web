import { useSessionActions } from "./actions";

/**
 * How long logging out waits for the backend to revoke the token before ending
 * the session anyway. Long enough for a slow but working backend, short enough
 * that somebody who clicked "Salir" is not left looking at the page they asked
 * to leave.
 */
export const LOGOUT_TIMEOUT_MS = 4000;

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
 * Asks the backend to revoke the session's token (#213), and settles once it
 * has answered, failed, or not answered within `LOGOUT_TIMEOUT_MS`. It never
 * rejects and never ends the session itself: the caller does that next,
 * whatever the backend did. The order matters -- the bearer token is attached
 * from the session, so ending it first would send the request without one. A
 * timed-out request keeps running and may still revoke the token; if it does
 * not, the token outlives the browser session until it expires.
 *
 * `useLogout` adds the navigation to the login page; a screen that must stay
 * where it is, such as the invitation screen (#274), ends the session without
 * leaving.
 */
export function useBoundedRevoke(): () => Promise<void> {
  const { logout } = useSessionActions().actions;
  return () => settleWithin(logout.run(), LOGOUT_TIMEOUT_MS);
}
