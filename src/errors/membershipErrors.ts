import type { RestErrorDetailCode } from "../api/models";
import { getFirstApiErrorCode, getFirstApiErrorMessage } from "./apiErrorCatalogue";
import { getRetryAfterSeconds } from "./authErrors";
import { NO_CONTACT_EMAIL_TO_INVITE, resendLimitMessage, type InvitationSubject } from "./membershipErrorMessages";

/** Which invitation write was refused: the same code can mean something else in each. */
export type InvitationWrite = "invite" | "resend" | "revoke" | "bulk";

const FALLBACKS: Record<InvitationWrite, string> = {
  invite: "No se ha podido enviar la invitación. Inténtalo de nuevo.",
  resend: "No se ha podido reenviar la invitación. Inténtalo de nuevo.",
  revoke: "No se ha podido revocar el enlace. Inténtalo de nuevo.",
  bulk: "No se han podido enviar las invitaciones. Inténtalo de nuevo.",
};

/**
 * The refusals that mean the row the screen acted on is stale: the membership
 * was invited, accepted or suspended since the roster was read.
 * useMembershipActions refetches the roster on these, and useCommunityActions
 * a community's admins on the same codes (#276), so the row shows the
 * state the backend refused from and the actions that state allows, and the
 * message says the list was refreshed.
 */
export const STALE_ROW_CODES: Record<Exclude<InvitationWrite, "bulk">, readonly RestErrorDetailCode[]> = {
  invite: ["MEMBERSHIP_ALREADY_INVITED", "MEMBERSHIP_ALREADY_EXISTS", "MEMBERSHIP_DISABLED"],
  resend: ["MEMBERSHIP_NOT_INVITED", "MEMBERSHIP_ALREADY_EXISTS", "MEMBERSHIP_DISABLED"],
  revoke: ["MEMBERSHIP_ALREADY_EXISTS"],
};

/**
 * The refusals worded per subject here rather than in the catalogue.
 * MEMBERSHIP_ALREADY_EXISTS means a registration of someone already in the
 * community in the catalogue, and an acceptance that happened meanwhile here.
 * The catalogue's NOT_INVITED and DISABLED name a member, so the admins page
 * words them for an admin (#276).
 */
const SUBJECT_REFUSALS: Record<InvitationSubject, Partial<Record<Exclude<RestErrorDetailCode, null>, string>>> = {
  member: {
    MEMBERSHIP_ALREADY_EXISTS: "Este miembro ya ha aceptado la invitación.",
  },
  admin: {
    MEMBERSHIP_ALREADY_EXISTS: "Este administrador ya ha aceptado la invitación.",
    MEMBERSHIP_NOT_INVITED: "Este administrador todavía no tiene ninguna invitación que reenviar.",
    MEMBERSHIP_DISABLED: "Este administrador está suspendido, así que no se le puede invitar.",
  },
};

/**
 * Why an invitation write was refused, in the words of the page that sent it:
 * the members page's (#275), or a community admins page's (#276).
 *
 * The catalogue words each code once. Two cannot be worded there: the contact
 * email refusal, whose catalogue entry is the record form's (an admin must keep
 * an email), and the resend limit, whose wait may come only in the Retry-After
 * header, which the catalogue never sees.
 */
export function invitationRefusalMessage(
  error: unknown,
  write: InvitationWrite,
  subject: InvitationSubject = "member",
): string {
  const code = getFirstApiErrorCode(error);
  const message = (() => {
    switch (code) {
      case "MEMBERSHIP_WITHOUT_CONTACT_EMAIL":
        return NO_CONTACT_EMAIL_TO_INVITE[subject];
      case "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED":
        return resendLimitMessage(getRetryAfterSeconds(error), subject);
      default:
        return (code && SUBJECT_REFUSALS[subject][code]) || getFirstApiErrorMessage(error, FALLBACKS[write]);
    }
  })();
  const refreshed = write !== "bulk" && !!code && STALE_ROW_CODES[write].includes(code);
  return refreshed ? `${message} Hemos actualizado la lista.` : message;
}

/** Why removing a member was refused: the reason when the backend gives one this page words. */
export function removalRefusalMessage(error: unknown): string {
  if (getFirstApiErrorCode(error) === "MEMBERSHIP_OWNS_SUPPLIES") {
    return getFirstApiErrorMessage(error, "");
  }
  return "Error al eliminar el miembro. Por favor, inténtalo de nuevo.";
}
