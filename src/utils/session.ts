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

/**
 * Drops a pending expiry note without showing it. A password reset ends the
 * session for a reason of its own (#233), and the login page should say that
 * one thing -- not also that a session which the reset revoked anyway had
 * expired.
 */
export function clearSessionExpired(): void {
  window.sessionStorage.removeItem(EXPIRED_FLAG_KEY);
}

export function takeSessionExpired(): boolean {
  const expired = window.sessionStorage.getItem(EXPIRED_FLAG_KEY) === "true";
  window.sessionStorage.removeItem(EXPIRED_FLAG_KEY);
  return expired;
}

/**
 * The other reason a session ends without the user asking to log out: they
 * changed their password (#196). The backend revokes every token issued before
 * the change, so the app ends the session and the login page says why, and
 * that the new password is the one to use. Same mechanics as the expiry flag:
 * a flag in `sessionStorage`, read once.
 */
export const PASSWORD_CHANGED_MESSAGE = "Contraseña cambiada. Inicia sesión con tu nueva contraseña.";

const PASSWORD_CHANGED_FLAG_KEY = "passwordChanged";

export function markPasswordChanged(): void {
  window.sessionStorage.setItem(PASSWORD_CHANGED_FLAG_KEY, "true");
}

export function takePasswordChanged(): boolean {
  const changed = window.sessionStorage.getItem(PASSWORD_CHANGED_FLAG_KEY) === "true";
  window.sessionStorage.removeItem(PASSWORD_CHANGED_FLAG_KEY);
  return changed;
}

/**
 * A password reset from an emailed link (#233). The backend ends every session
 * of that user, and creates none, so the app ends any session it still holds
 * and the login page says the reset worked. A flag in `sessionStorage`, as
 * above, but read in two steps: `hasPasswordReset` while rendering, and
 * `clearPasswordReset` once the page has committed. Arriving from the reset,
 * the login page is first rendered and then discarded before it mounts for
 * good, and a render that both read and cleared the flag would lose it.
 */
export const PASSWORD_RESET_MESSAGE = "Contraseña restablecida. Inicia sesión con tu nueva contraseña.";

const PASSWORD_RESET_FLAG_KEY = "passwordReset";

export function markPasswordReset(): void {
  window.sessionStorage.setItem(PASSWORD_RESET_FLAG_KEY, "true");
}

export function hasPasswordReset(): boolean {
  return window.sessionStorage.getItem(PASSWORD_RESET_FLAG_KEY) === "true";
}

export function clearPasswordReset(): void {
  window.sessionStorage.removeItem(PASSWORD_RESET_FLAG_KEY);
}
