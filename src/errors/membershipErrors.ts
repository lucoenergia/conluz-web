import type { RestErrorDetailCode } from "../api/models";
import { getFirstApiErrorCode, getFirstApiErrorMessage } from "./apiErrorCatalogue";
import { getRetryAfterSeconds } from "./authErrors";
import {
  LAST_ACTIVE_ADMIN_EXPLANATION,
  NO_CONTACT_EMAIL_TO_INVITE,
  resendLimitMessage,
  type InvitationSubject,
} from "./membershipErrorMessages";

/** Which invitation write was refused: the same code can mean something else in each. */
export type InvitationWrite = "invite" | "resend" | "revoke" | "bulk";

const FALLBACKS: Record<InvitationWrite, string> = {
  invite: "No se ha podido enviar la invitación. Inténtalo de nuevo.",
  resend: "No se ha podido reenviar la invitación. Inténtalo de nuevo.",
  revoke: "No se ha podido revocar el enlace. Inténtalo de nuevo.",
  bulk: "No se han podido enviar las invitaciones. Inténtalo de nuevo.",
};

/** A membership write whose refusal can mean the roster is stale. */
export type StaleRowWrite = Exclude<InvitationWrite, "bulk"> | "changeRole" | "remove";

/**
 * The refusals that mean the row the screen acted on is stale: the membership
 * was invited, accepted or suspended since the roster was read, or, for the
 * role change and the removal, it became the community's last active admin
 * because another admin was demoted, suspended or removed meanwhile (#309).
 * useMembershipActions refetches the roster on these, and useCommunityActions
 * a community's admins on the invitation codes (#276), so the row shows the
 * state the backend refused from and the actions that state allows, and the
 * message says the list was refreshed.
 */
export const STALE_ROW_CODES: Record<StaleRowWrite, readonly RestErrorDetailCode[]> = {
  invite: ["MEMBERSHIP_ALREADY_INVITED", "MEMBERSHIP_ALREADY_EXISTS", "MEMBERSHIP_DISABLED"],
  resend: ["MEMBERSHIP_NOT_INVITED", "MEMBERSHIP_ALREADY_EXISTS", "MEMBERSHIP_DISABLED"],
  revoke: ["MEMBERSHIP_ALREADY_EXISTS"],
  changeRole: ["MEMBERSHIP_LAST_ACTIVE_ADMIN"],
  remove: ["MEMBERSHIP_LAST_ACTIVE_ADMIN"],
};

/** The message, saying the list was refreshed when the refusal refetched it. */
function withRefreshedNote(message: string, write: StaleRowWrite, code: RestErrorDetailCode | undefined): string {
  return code && STALE_ROW_CODES[write].includes(code) ? `${message} Hemos actualizado la lista.` : message;
}

/**
 * The refusals worded per subject here rather than in the catalogue.
 * MEMBERSHIP_ALREADY_EXISTS means a registration of someone already in the
 * community in the catalogue, and an acceptance that happened meanwhile here.
 * The catalogue's NOT_INVITED and DISABLED name a member, so the admins page
 * words them for someone whose invitation is pending, who is not an admin yet
 * (#276, #310).
 */
const SUBJECT_REFUSALS: Record<InvitationSubject, Partial<Record<Exclude<RestErrorDetailCode, null>, string>>> = {
  member: {
    MEMBERSHIP_ALREADY_EXISTS: "Este miembro ya ha aceptado la invitación.",
  },
  admin: {
    MEMBERSHIP_ALREADY_EXISTS: "Esta persona ya ha aceptado la invitación.",
    MEMBERSHIP_NOT_INVITED: "Esta persona todavía no tiene ninguna invitación que reenviar.",
    MEMBERSHIP_DISABLED: "Esta persona está suspendida, así que no se le puede invitar.",
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
  return write === "bulk" ? message : withRefreshedNote(message, write, code);
}

/**
 * MEMBERSHIP_OWNS_SUPPLIES for an admin. The catalogue's wording recommends
 * suspending, which a community admin cannot do to another admin
 * (lucoenergia/conluz#449, MEM-034), so this one recommends demoting them to
 * member first (#309).
 */
const ADMIN_OWNS_SUPPLIES =
  "Este administrador es titular de suministros en esta comunidad. Si quieres que deje de tener acceso, primero cámbiale el rol a miembro y después suspéndelo; para eliminarlo, antes hay que eliminar sus suministros.";

/**
 * Why removing a membership was refused: the reason when the backend gives one
 * this page words. `subject` is the removed membership's role, which decides
 * what the supplies refusal recommends.
 */
export function removalRefusalMessage(error: unknown, subject: InvitationSubject = "member"): string {
  const code = getFirstApiErrorCode(error);
  switch (code) {
    case "MEMBERSHIP_LAST_ACTIVE_ADMIN":
      return withRefreshedNote(LAST_ACTIVE_ADMIN_EXPLANATION, "remove", code);
    case "MEMBERSHIP_OWNS_SUPPLIES":
      return subject === "admin" ? ADMIN_OWNS_SUPPLIES : getFirstApiErrorMessage(error, "");
    default:
      return "Error al eliminar el miembro. Por favor, inténtalo de nuevo.";
  }
}

/** Why a role change was refused: the reason when the backend gives one this page words. */
export function roleChangeRefusalMessage(error: unknown): string {
  const code = getFirstApiErrorCode(error);
  if (code === "MEMBERSHIP_LAST_ACTIVE_ADMIN") {
    return withRefreshedNote(LAST_ACTIVE_ADMIN_EXPLANATION, "changeRole", code);
  }
  return "Error al actualizar el rol. Por favor, inténtalo de nuevo.";
}
