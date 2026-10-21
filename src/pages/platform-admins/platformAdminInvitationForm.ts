import type { InvitePlatformAdminBody } from "../../api/models";
import { getFirstApiErrorCode, getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import { INVITATIONS_UNAVAILABLE_MESSAGE } from "../../errors/platformAdminErrors";
import { personalIdRefusalOf, type AdminInvitationValues, type MemberRecordRefusal } from "../members/memberRecordForm";

/**
 * The platform-admin invitation's body (#288), from the community admin
 * invitation's values (#276): its personal ID, name and email, which goes as
 * `email`. The platform invitation takes no phone, and its form asks for none.
 * Trimmed, as the community admin invitation sends them; the backend
 * normalises the personal ID.
 */
export function platformAdminInvitationBodyOf(values: AdminInvitationValues): InvitePlatformAdminBody {
  return {
    personalId: values.personalId.trim(),
    fullName: values.fullName.trim(),
    email: values.contactEmail.trim(),
  };
}

const REFRESHED = " Hemos actualizado la lista.";

const statusOf = (error: unknown) =>
  (error as { response?: { status?: number } } | null | undefined)?.response?.status;

/**
 * Where a refused platform-admin invitation is shown: the personal ID on its
 * field; the person already holding the role or already invited, and
 * invitations being unavailable, for the whole form, since nothing was created
 * or sent and no field is wrong. The two about the person refetched the list,
 * and say so.
 */
export function platformAdminInvitationRefusalOf(error: unknown): MemberRecordRefusal {
  const personalId = personalIdRefusalOf(error);
  if (personalId) return personalId;
  switch (getFirstApiErrorCode(error)) {
    case "USER_ALREADY_PLATFORM_ADMIN":
      return { form: "Esta persona ya es administradora de la plataforma." + REFRESHED };
    case "PLATFORM_ADMIN_ALREADY_INVITED":
      return {
        form: "Esta persona ya tiene una invitación pendiente: reenvíasela desde la lista." + REFRESHED,
      };
    case "PLATFORM_ADMIN_INVITATION_UNAVAILABLE":
      return { form: INVITATIONS_UNAVAILABLE_MESSAGE };
  }
  switch (statusOf(error)) {
    case 503:
      return { form: INVITATIONS_UNAVAILABLE_MESSAGE };
    case 403:
      return { form: "No tienes permiso para invitar administradores de plataforma." };
    case 400:
      return { form: getFirstApiErrorMessage(error, "Revisa los datos de la persona.") };
    default:
      return { form: "No se ha podido enviar la invitación. Inténtalo de nuevo." };
  }
}
