import { getFirstApiErrorCode } from "./apiErrorCatalogue";

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
