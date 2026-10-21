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

/**
 * An accepted invitation (#274). The person now belongs to a community, and
 * the next screen says so: the login page, when the invitation set the
 * account's first password, or the landing, when it was accepted signed in.
 *
 * A flag in `sessionStorage`, as above, holding the community's name and
 * nothing else -- never the token. The login page reads it in two steps, like
 * the reset flag and for the same reason; the landing takes it in an effect,
 * which runs only once the page has committed.
 */
const INVITATION_ACCEPTED_KEY = "invitationAccepted";

export function invitationAcceptedLoginMessage(communityName: string): string {
  return `Ya formas parte de ${communityName}. Inicia sesión con tu nueva contraseña.`;
}

export function invitationAcceptedMessage(communityName: string): string {
  return `Ya formas parte de ${communityName}.`;
}

export function markInvitationAccepted(communityName: string): void {
  window.sessionStorage.setItem(INVITATION_ACCEPTED_KEY, communityName);
}

export function peekInvitationAccepted(): string | null {
  return window.sessionStorage.getItem(INVITATION_ACCEPTED_KEY) || null;
}

export function clearInvitationAccepted(): void {
  window.sessionStorage.removeItem(INVITATION_ACCEPTED_KEY);
}

export function takeInvitationAccepted(): string | null {
  const communityName = peekInvitationAccepted();
  clearInvitationAccepted();
  return communityName;
}

/**
 * An accepted platform-admin invitation (#288). The same two screens say so as
 * for a community, under a key of its own, so the community's flag and its
 * readers are untouched. It holds only "true": never the token, the code or a
 * name.
 */
const PLATFORM_INVITATION_ACCEPTED_KEY = "platformInvitationAccepted";

export const PLATFORM_INVITATION_ACCEPTED_LOGIN_MESSAGE =
  "Ya eres administrador de la plataforma. Inicia sesión con tu nueva contraseña.";

export const PLATFORM_INVITATION_ACCEPTED_MESSAGE = "Ya eres administrador de la plataforma.";

export function markPlatformInvitationAccepted(): void {
  window.sessionStorage.setItem(PLATFORM_INVITATION_ACCEPTED_KEY, "true");
}

export function peekPlatformInvitationAccepted(): boolean {
  return window.sessionStorage.getItem(PLATFORM_INVITATION_ACCEPTED_KEY) === "true";
}

export function clearPlatformInvitationAccepted(): void {
  window.sessionStorage.removeItem(PLATFORM_INVITATION_ACCEPTED_KEY);
}

export function takePlatformInvitationAccepted(): boolean {
  const accepted = peekPlatformInvitationAccepted();
  clearPlatformInvitationAccepted();
  return accepted;
}
