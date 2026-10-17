import type { MembershipResponse, UpdateMemberRecordBody } from "../../api/models";
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

export type MemberRecordField = keyof MemberRecordValues;

export type MemberRecordErrors = Partial<Record<MemberRecordField, string>>;

/** A refused save: a message on one field, or one for the whole form. */
export type MemberRecordRefusal = { field: MemberRecordField; message: string } | { form: string };

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
