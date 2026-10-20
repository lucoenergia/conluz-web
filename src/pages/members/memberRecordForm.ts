import type {
  InviteCommunityAdminBody,
  MembershipResponse,
  RegisterMemberBody,
  UpdateMemberRecordBody,
} from "../../api/models";
import { getFirstApiErrorCode, getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import { isValidEmail } from "../../utils/email";

/** The record as the form edits it: every field as typed, the number included. */
export interface MemberRecordValues {
  fullName: string;
  memberNumber: string;
  contactEmail: string;
  address: string;
  phoneNumber: string;
}

/** A registration: the record, and the personal ID the member is registered with (#275). */
export interface RegistrationValues extends MemberRecordValues {
  personalId: string;
}

/**
 * An admin invitation: the personal ID and the part of the record the invite
 * endpoint takes, the contact email required since the invitation goes to it
 * (#276).
 */
export type AdminInvitationValues = Pick<RegistrationValues, "personalId" | "fullName" | "contactEmail" | "phoneNumber">;

export type MemberRecordField = keyof RegistrationValues;

export type MemberRecordErrors = Partial<Record<MemberRecordField, string>>;

/** A refused save: a message on one field, or one for the whole form. */
export type MemberRecordRefusal = { field: MemberRecordField; message: string } | { form: string };

export const EMPTY_REGISTRATION: RegistrationValues = {
  personalId: "",
  fullName: "",
  memberNumber: "",
  contactEmail: "",
  address: "",
  phoneNumber: "",
};

/**
 * The record the form starts from. A community-scoped response reads a member's
 * name and contact details from the community's member record
 * (lucoenergia/conluz#396), so the roster row's user is that record.
 */
export function recordValuesOf(membership: MembershipResponse | null | undefined): MemberRecordValues {
  const user = membership?.user;
  return {
    fullName: user?.fullName ?? "",
    memberNumber: user?.number == null ? "" : String(user.number),
    contactEmail: user?.email ?? "",
    address: user?.address ?? "",
    phoneNumber: user?.phoneNumber ?? "",
  };
}

// Digits only: the backend takes an integer of 0 or more, so a sign, a decimal
// point or an exponent is a mistake to point out, not something to round.
const MEMBER_NUMBER = /^\d+$/;

export function validateRecord(values: MemberRecordValues): MemberRecordErrors {
  const errors: MemberRecordErrors = {};
  if (values.fullName.trim() === "") errors.fullName = "Escribe el nombre completo";
  const number = values.memberNumber.trim();
  if (number !== "" && !MEMBER_NUMBER.test(number)) {
    errors.memberNumber = "Escribe un número entero igual o mayor que 0";
  }
  const email = values.contactEmail.trim();
  if (email !== "" && !isValidEmail(email)) errors.contactEmail = "Introduce un email válido";
  return errors;
}

/** The record's rules, plus the personal ID, which a registration requires. */
export function validateRegistration(values: RegistrationValues): MemberRecordErrors {
  const errors = validateRecord(values);
  if (values.personalId.trim() === "") errors.personalId = "Escribe el DNI/NIE";
  return errors;
}

export const EMPTY_ADMIN_INVITATION: AdminInvitationValues = {
  personalId: "",
  fullName: "",
  contactEmail: "",
  phoneNumber: "",
};

/** The invitation's rules: the personal ID, the name and a valid contact email. */
export function validateAdminInvitation(values: AdminInvitationValues): MemberRecordErrors {
  const errors: MemberRecordErrors = {};
  if (values.personalId.trim() === "") errors.personalId = "Escribe el DNI/NIE";
  if (values.fullName.trim() === "") errors.fullName = "Escribe el nombre completo";
  const email = values.contactEmail.trim();
  if (email === "") errors.contactEmail = "Escribe el email de contacto";
  else if (!isValidEmail(email)) errors.contactEmail = "Introduce un email válido";
  return errors;
}

const orNull = (value: string) => value.trim() || null;

/**
 * The whole record, every field present. The endpoint replaces the record, so a
 * field left out would clear it: sending only what changed would wipe the rest.
 * An empty optional field goes as null, which is how the record clears it.
 */
export function recordBodyOf(values: MemberRecordValues): UpdateMemberRecordBody {
  const number = values.memberNumber.trim();
  return {
    fullName: values.fullName.trim(),
    memberNumber: number === "" ? null : Number.parseInt(number, 10),
    contactEmail: orNull(values.contactEmail),
    address: orNull(values.address),
    phoneNumber: orNull(values.phoneNumber),
  };
}

/**
 * The whole registration, as recordBodyOf sends a record, plus the personal ID.
 * The ID goes as typed: the backend normalises it, so dots, hyphens or a lower
 * case letter are not mistakes to point out.
 */
export function registrationBodyOf(values: RegistrationValues): RegisterMemberBody {
  return { personalId: values.personalId.trim(), ...recordBodyOf(values) };
}

/**
 * The whole invitation, the personal ID as typed as registrationBodyOf sends
 * it, and an empty phone as null, which the endpoint records as none.
 */
export function adminInvitationBodyOf(values: AdminInvitationValues): InviteCommunityAdminBody {
  return {
    personalId: values.personalId.trim(),
    fullName: values.fullName.trim(),
    contactEmail: values.contactEmail.trim(),
    phoneNumber: orNull(values.phoneNumber),
  };
}

/**
 * Whether the membership has an invitation link that can still be used, and
 * has not been accepted: the next resend of it goes to the record's contact
 * email, so changing the email changes where it goes.
 */
export function hasPendingInvitation(membership: MembershipResponse | null | undefined): boolean {
  return !!membership && membership.acceptedAt === null && membership.invitationExpiresAt !== null;
}

const statusOf = (error: unknown) =>
  (error as { response?: { status?: number } } | null | undefined)?.response?.status;

/**
 * Where a refused save is shown. Only MEMBERSHIP_WITHOUT_CONTACT_EMAIL names
 * a field: the backend's bean-validation 400 carries neither a code nor the
 * field, so it can only be shown for the whole form.
 */
export function refusalOf(error: unknown): MemberRecordRefusal {
  if (getFirstApiErrorCode(error) === "MEMBERSHIP_WITHOUT_CONTACT_EMAIL") {
    return { field: "contactEmail", message: getFirstApiErrorMessage(error, "Añade un email de contacto.") };
  }
  switch (statusOf(error)) {
    case 403:
      return { form: "No tienes permiso para editar la ficha de este miembro." };
    case 404:
      return { form: "Este miembro ya no pertenece a la comunidad." };
    case 400:
      return { form: getFirstApiErrorMessage(error, "Revisa los datos de la ficha.") };
    default:
      return { form: "No se ha podido guardar la ficha. Inténtalo de nuevo." };
  }
}

/**
 * A personal ID the backend refused as no valid DNI, NIE or NIF
 * (lucoenergia/conluz#398), on the field it is about. Shared by the member
 * registration and the admin invitations, which all ask for it (#276, #288).
 */
export function personalIdRefusalOf(error: unknown): MemberRecordRefusal | undefined {
  if (getFirstApiErrorCode(error) !== "USER_PERSONAL_ID_INVALID") return undefined;
  return {
    field: "personalId",
    message: getFirstApiErrorMessage(error, "El DNI/NIE/NIF no es válido. Revisa los números y la letra."),
  };
}

/**
 * Where a refused registration is shown. USER_PERSONAL_ID_INVALID goes on the
 * personal ID. Every other refusal is for the whole form:
 * MEMBERSHIP_ALREADY_EXISTS is about the person, not one field, and the
 * backend's validation errors name no field.
 */
export function registrationRefusalOf(error: unknown): MemberRecordRefusal {
  const personalId = personalIdRefusalOf(error);
  if (personalId) return personalId;
  if (getFirstApiErrorCode(error) === "MEMBERSHIP_ALREADY_EXISTS") {
    return { form: getFirstApiErrorMessage(error, "Esta persona ya es miembro de la comunidad.") };
  }
  switch (statusOf(error)) {
    case 403:
      return { form: "No tienes permiso para registrar miembros en esta comunidad." };
    case 400:
      return { form: getFirstApiErrorMessage(error, "Revisa los datos del miembro.") };
    default:
      return { form: "No se ha podido registrar al miembro. Inténtalo de nuevo." };
  }
}

/**
 * Where a refused admin invitation is shown (#276): the personal ID on its
 * field, as in a registration; the person already being in the community and
 * invitations being unavailable for the whole form, since nothing was created
 * or sent and no field is wrong.
 */
export function adminInvitationRefusalOf(error: unknown): MemberRecordRefusal {
  const personalId = personalIdRefusalOf(error);
  if (personalId) return personalId;
  switch (getFirstApiErrorCode(error)) {
    case "MEMBERSHIP_ALREADY_EXISTS":
      return { form: getFirstApiErrorMessage(error, "Esta persona ya es miembro de la comunidad.") };
    case "MEMBERSHIP_INVITATION_UNAVAILABLE":
      return {
        form: getFirstApiErrorMessage(error, "Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde."),
      };
  }
  switch (statusOf(error)) {
    case 403:
      return { form: "No tienes permiso para invitar administradores en esta comunidad." };
    case 400:
      return { form: getFirstApiErrorMessage(error, "Revisa los datos del administrador.") };
    default:
      return { form: "No se ha podido invitar al administrador. Inténtalo de nuevo." };
  }
}
