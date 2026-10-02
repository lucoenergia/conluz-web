/**
 * Why a session ended, and the one sentence the user is shown about it.
 *
 * Two code paths end a session without the user asking: a 401 thrown by any
 * query, caught by `AuthErrorBoundry`, and a 401 on the current-user query,
 * handled by `LoggedUserProvider` because that query sits above every boundary
 * (#203). Both say the same thing, from one literal, so the wording cannot
 * drift into two sentences that mean the same.
 */
export const SESSION_EXPIRED_MESSAGE = "Sesión expirada, por favor vuelve al login";

/**
 * The provider can clear the session but cannot navigate -- it sits above
 * `BrowserRouter` -- so `ProtectedRoute` is what sends the user to the login
 * page, and the reason has to survive that redirect to be shown there.
 *
 * `sessionStorage` rather than state: the destination is a different route, and
 * the flag must not outlive the tab. Read once and cleared, so a later visit to
 * /login does not claim an expiry that already happened.
 */
const EXPIRED_FLAG_KEY = "sessionExpired";

export function markSessionExpired(): void {
  window.sessionStorage.setItem(EXPIRED_FLAG_KEY, "true");
}

export function takeSessionExpired(): boolean {
  const expired = window.sessionStorage.getItem(EXPIRED_FLAG_KEY) === "true";
  window.sessionStorage.removeItem(EXPIRED_FLAG_KEY);
  return expired;
}
