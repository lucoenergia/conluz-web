import { pluralize } from "../utils/pluralize";

/**
 * Sentences shared by the error catalogue and src/errors/membershipErrors.ts.
 * A leaf module, importing nothing that imports the catalogue, so both can use
 * it without a cycle.
 */

/**
 * Whom an invitation is for: a member on the members page, an admin on a
 * community's admins page (#276) or on the platform-admin page (#288). The
 * sentences name them. Each is said of someone whose invitation is still
 * pending, who is not an admin yet, so an admin is "esta persona" (#310).
 */
export type InvitationSubject = "member" | "admin";

export const SUBJECT_NOUN: Record<InvitationSubject, string> = {
  member: "este miembro",
  admin: "esta persona",
};

/**
 * Why the community's last active admin cannot be demoted or removed
 * (lucoenergia/conluz#449, #309): the reason the members page shows on the
 * actions it disables, and the catalogue's wording of the refusal.
 */
export const LAST_ACTIVE_ADMIN_EXPLANATION =
  "Es el último administrador activo de la comunidad. Primero haz administrador a otro miembro activo.";

/**
 * Refused because a pending membership has no contact email to invite at (#275).
 * The members page points to its own record edit; the platform admin has none
 * on the admins page, so that one says who can add it.
 */
export const NO_CONTACT_EMAIL_TO_INVITE: Record<InvitationSubject, string> = {
  member: "Este miembro no tiene email de contacto. Añádelo desde «Editar ficha» y vuelve a intentarlo.",
  admin: "Esta persona no tiene email de contacto. Un administrador de la comunidad puede añadirlo desde su ficha.",
};

/**
 * The wait before another resend, rounded up: in minutes under an hour, in
 * hours from there, since the limit counts the invitations of a whole day.
 */
function waitText(seconds: number): string {
  if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} ${pluralize(minutes, "minuto", "minutos")}`;
  }
  const hours = Math.ceil(seconds / 3600);
  return `${hours} ${pluralize(hours, "hora", "horas")}`;
}

/** MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED, with the wait when the backend gave one. */
export function resendLimitMessage(retryAfterSeconds: number | null, subject: InvitationSubject = "member"): string {
  const limit = `Has alcanzado el límite de reenvíos para ${SUBJECT_NOUN[subject]}.`;
  if (retryAfterSeconds === null) return `${limit} Vuelve a intentarlo más tarde.`;
  return `${limit} Podrás volver a reenviar la invitación dentro de ${waitText(retryAfterSeconds)}.`;
}
