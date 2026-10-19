import { pluralize } from "../utils/pluralize";

/**
 * Sentences shared by the error catalogue and src/errors/membershipErrors.ts.
 * A leaf module, importing nothing that imports the catalogue, so both can use
 * it without a cycle.
 */

/** Refused because a pending membership has no contact email to invite at (#275). */
export const NO_CONTACT_EMAIL_TO_INVITE =
  "Este miembro no tiene email de contacto. Añádelo desde «Editar ficha» y vuelve a intentarlo.";

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
export function resendLimitMessage(retryAfterSeconds: number | null): string {
  const limit = "Has alcanzado el límite de reenvíos para este miembro.";
  if (retryAfterSeconds === null) return `${limit} Vuelve a intentarlo más tarde.`;
  return `${limit} Podrás volver a reenviar la invitación dentro de ${waitText(retryAfterSeconds)}.`;
}
