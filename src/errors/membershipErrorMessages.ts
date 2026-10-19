import { pluralize } from "../utils/pluralize";

/**
 * Sentences shared by the error catalogue and src/errors/membershipErrors.ts.
 * A leaf module, importing nothing that imports the catalogue, so both can use
 * it without a cycle.
 */

/**
 * Whom an invitation is for: a member on the members page, an admin on a
 * community's admins page (#276). The sentences name them.
 */
export type InvitationSubject = "member" | "admin";

export const SUBJECT_NOUN: Record<InvitationSubject, string> = {
  member: "este miembro",
  admin: "este administrador",
};

/**
 * Refused because a pending membership has no contact email to invite at (#275).
 * The members page points to its own record edit; the platform admin has none
 * on the admins page, so that one says who can add it.
 */
export const NO_CONTACT_EMAIL_TO_INVITE: Record<InvitationSubject, string> = {
  member: "Este miembro no tiene email de contacto. Añádelo desde «Editar ficha» y vuelve a intentarlo.",
  admin: "Este administrador no tiene email de contacto. Un administrador de la comunidad puede añadirlo desde su ficha.",
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
