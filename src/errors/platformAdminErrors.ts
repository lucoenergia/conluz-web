import { getFirstApiErrorCode } from "./apiErrorCatalogue";
import { getRetryAfterSeconds } from "./authErrors";
import { resendLimitMessage } from "./membershipErrorMessages";

/**
 * Why revoking a platform admin was refused.
 *
 * Three refusals say the row the screen acted on is stale -- the list was read
 * before somebody else changed it -- so the list is refetched and the message
 * says so:
 *
 * - `last-admin`: USER_LAST_PLATFORM_ADMIN. The row was revocable when it was
 *   read, but another revoke landed first and left this one the last enabled
 *   platform admin.
 * - `not-platform-admin`: USER_NOT_PLATFORM_ADMIN. Somebody else revoked it.
 * - `not-found`: a 404. The account no longer exists.
 *
 * Anything else is `other`: a failure that says nothing about the row.
 */
export type RevokePlatformAdminRefusal = "last-admin" | "not-platform-admin" | "not-found" | "other";

export function revokePlatformAdminRefusal(error: unknown): RevokePlatformAdminRefusal {
  const code = getFirstApiErrorCode(error);
  if (code === "USER_LAST_PLATFORM_ADMIN") return "last-admin";
  if (code === "USER_NOT_PLATFORM_ADMIN") return "not-platform-admin";
  const status = (error as { response?: { status?: number } } | null | undefined)?.response?.status;
  if (status === 404) return "not-found";
  return "other";
}

export const isStaleRowRefusal = (refusal: RevokePlatformAdminRefusal) => refusal !== "other";

const REFRESHED = " Hemos actualizado la lista.";

const MESSAGES: Record<RevokePlatformAdminRefusal, string> = {
  "last-admin":
    "No puedes revocar el rol: la plataforma necesita al menos un administrador de plataforma habilitado." +
    REFRESHED,
  "not-platform-admin": "Esta persona ya no es administradora de plataforma." + REFRESHED,
  "not-found": "Esta cuenta ya no existe." + REFRESHED,
  other: "No se ha podido revocar el rol. Inténtalo de nuevo.",
};

export const revokePlatformAdminRefusalMessage = (refusal: RevokePlatformAdminRefusal) => MESSAGES[refusal];

/**
 * The platform-admin invitation's writes (#288): inviting from the page's form,
 * and resending or revoking a pending row's link from its menu.
 */
export type PlatformInvitationWrite = "invite" | "resend" | "revoke";

export const INVITATIONS_UNAVAILABLE_MESSAGE = "Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde.";

/**
 * The refusals that mean the list the caller acted on is out of date: the
 * person already holds the role or already has an invitation (invite), or the
 * row's invitation is gone -- accepted, or the account deleted (resend, revoke).
 */
const STALE_INVITATION_CODES: Record<PlatformInvitationWrite, readonly string[]> = {
  invite: ["USER_ALREADY_PLATFORM_ADMIN", "PLATFORM_ADMIN_ALREADY_INVITED"],
  resend: ["PLATFORM_ADMIN_NOT_INVITED"],
  revoke: ["PLATFORM_ADMIN_NOT_INVITED"],
};

function httpStatusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status;
}

/** Whether a refused invitation write refetches the list. A 404 on a row is an account that is gone. */
export function isPlatformInvitationStaleRow(error: unknown, write: PlatformInvitationWrite): boolean {
  const code = getFirstApiErrorCode(error);
  if (code && STALE_INVITATION_CODES[write].includes(code)) return true;
  return write !== "invite" && httpStatusOf(error) === 404;
}

const WRITE_FAILED: Record<"resend" | "revoke", string> = {
  resend: "No se ha podido reenviar la invitación. Inténtalo de nuevo.",
  revoke: "No se ha podido revocar el enlace. Inténtalo de nuevo.",
};

/**
 * What a refused resend or link revoke says (#288). The resend limit gives the
 * wait from `Retry-After` or the body, naming the invitee (#310); a stale row says
 * the list was refreshed, which the action did.
 */
export function platformInvitationWriteMessage(error: unknown, write: "resend" | "revoke"): string {
  const code = getFirstApiErrorCode(error);
  if (code === "PLATFORM_ADMIN_INVITATION_RESEND_LIMIT_REACHED") {
    return resendLimitMessage(getRetryAfterSeconds(error), "admin");
  }
  if (code === "PLATFORM_ADMIN_NOT_INVITED") {
    return "Esta persona ya no tiene una invitación pendiente." + REFRESHED;
  }
  const status = httpStatusOf(error);
  if (status === 404) return "Esta cuenta ya no existe." + REFRESHED;
  if (code === "PLATFORM_ADMIN_INVITATION_UNAVAILABLE" || status === 503) return INVITATIONS_UNAVAILABLE_MESSAGE;
  return WRITE_FAILED[write];
}
