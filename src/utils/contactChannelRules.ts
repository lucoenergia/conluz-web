import type { ContactChannelBody, ContactChannelBodyType, ContactChannelResponse, RestErrorDetailCode } from "../api/models";
import { isValidEmail } from "./email";

/**
 * The rules a community's contact channels are held to (lucoenergia/conluz#462),
 * mirrored so the channel editor (#296) can point at a field before a request
 * is spent.
 * The backend stays authoritative: it trims first and checks the same limits.
 */
export const CONTACT_CHANNEL_LIMITS = {
  maxChannels: 10,
  label: 60,
  value: 200,
  schedule: 200,
  notes: 500,
  phoneMinDigits: 6,
} as const;

/** The editable fields of a channel, in the order they are shown and focused. */
export const CONTACT_CHANNEL_FIELDS = ["type", "label", "value", "schedule", "notes"] as const;
export type ContactChannelField = (typeof CONTACT_CHANNEL_FIELDS)[number];

/** One channel as the editor holds it: every field a string, nothing trimmed yet. */
export interface ContactChannelDraft {
  type: ContactChannelBodyType;
  label: string;
  value: string;
  schedule: string;
  notes: string;
}

export type ContactChannelErrors = Partial<Record<ContactChannelField, string>>;

const VALUE_BLANK: Record<ContactChannelBodyType, string> = {
  PHONE: "Escribe un número de teléfono.",
  EMAIL: "Escribe un email.",
  ADDRESS: "Escribe una dirección.",
};

// "Ahora tiene {n}." only when the current length is known: the backend's
// refusal carries the limit but not the length, which the page supplies from
// what it sent.
const now = (n: number | undefined, verb = "tiene") => (n === undefined ? "" : ` Ahora ${verb} ${n}.`);

/**
 * One wording per rule (#296), shared by the editor's own checks and by the
 * backend's refusals of the same rule (apiErrorCatalogue), so the two cannot
 * disagree.
 */
export const CONTACT_CHANNEL_MESSAGES = {
  labelBlank: "Escribe un nombre para el canal, por ejemplo «Oficina».",
  labelTooLong: (n?: number) => `El nombre puede tener hasta ${CONTACT_CHANNEL_LIMITS.label} caracteres.${now(n)}`,
  valueBlank: (type: ContactChannelBodyType) => VALUE_BLANK[type],
  valueTooLong: (n?: number) => `Puede tener hasta ${CONTACT_CHANNEL_LIMITS.value} caracteres.${now(n)}`,
  scheduleTooLong: (n?: number) => `El horario puede tener hasta ${CONTACT_CHANNEL_LIMITS.schedule} caracteres.${now(n)}`,
  notesTooLong: (n?: number) => `Las notas pueden tener hasta ${CONTACT_CHANNEL_LIMITS.notes} caracteres.${now(n, "tienen")}`,
  emailInvalid: "Revisa el email: debe tener la forma nombre@dominio.es.",
  // Both phone rules (characters and digit count) share one message.
  phoneInvalid: `Escribe al menos ${CONTACT_CHANNEL_LIMITS.phoneMinDigits} cifras. Solo números, espacios y un + al principio.`,
} as const;

/** The limit text shown instead of "Añadir canal" at the maximum. */
export const CONTACT_CHANNEL_LIMIT_TEXT = `Puedes tener hasta ${CONTACT_CHANNEL_LIMITS.maxChannels} canales de contacto.`;

/**
 * Which field a per-channel refusal belongs to. A code not listed here is shown
 * for the whole channel. The type is a choice of three, so its refusal cannot
 * be reached and is not listed.
 */
export const CONTACT_CHANNEL_CODE_FIELD: Partial<Record<Exclude<RestErrorDetailCode, null>, ContactChannelField>> = {
  CONTACT_CHANNEL_LABEL_BLANK: "label",
  CONTACT_CHANNEL_LABEL_TOO_LONG: "label",
  CONTACT_CHANNEL_VALUE_BLANK: "value",
  CONTACT_CHANNEL_VALUE_TOO_LONG: "value",
  CONTACT_CHANNEL_SCHEDULE_TOO_LONG: "schedule",
  CONTACT_CHANNEL_NOTES_TOO_LONG: "notes",
  CONTACT_CHANNEL_EMAIL_INVALID: "value",
  CONTACT_CHANNEL_PHONE_CHARACTERS_INVALID: "value",
  CONTACT_CHANNEL_PHONE_TOO_FEW_DIGITS: "value",
};

// Digits and spaces, with one optional leading "+", as the backend's
// PhoneNumberFormatChecker has it.
const PHONE_CHARACTERS = /^\+?[0-9 ]*$/;

function checkRequired(
  text: string,
  maxLength: number,
  blank: string,
  tooLong: (n: number) => string,
): string | undefined {
  if (text === "") return blank;
  if (text.length > maxLength) return tooLong(text.length);
  return undefined;
}

function checkValueFormat(type: ContactChannelBodyType, value: string): string | undefined {
  if (type === "EMAIL" && !isValidEmail(value)) return CONTACT_CHANNEL_MESSAGES.emailInvalid;
  if (type === "PHONE") {
    if (!PHONE_CHARACTERS.test(value) || value.replace(/\D/g, "").length < CONTACT_CHANNEL_LIMITS.phoneMinDigits) {
      return CONTACT_CHANNEL_MESSAGES.phoneInvalid;
    }
  }
  return undefined;
}

/** The problems of one channel, by field, after trimming. Empty when it is valid. */
export function validateChannel(draft: ContactChannelDraft): ContactChannelErrors {
  const label = draft.label.trim();
  const value = draft.value.trim();
  const errors: ContactChannelErrors = {};

  const labelError = checkRequired(
    label,
    CONTACT_CHANNEL_LIMITS.label,
    CONTACT_CHANNEL_MESSAGES.labelBlank,
    CONTACT_CHANNEL_MESSAGES.labelTooLong,
  );
  if (labelError) errors.label = labelError;

  // The format is checked only on a value that is present and fits, as the backend does.
  const valueError =
    checkRequired(
      value,
      CONTACT_CHANNEL_LIMITS.value,
      CONTACT_CHANNEL_MESSAGES.valueBlank(draft.type),
      CONTACT_CHANNEL_MESSAGES.valueTooLong,
    ) ??
    checkValueFormat(draft.type, value);
  if (valueError) errors.value = valueError;

  const schedule = draft.schedule.trim();
  if (schedule.length > CONTACT_CHANNEL_LIMITS.schedule) {
    errors.schedule = CONTACT_CHANNEL_MESSAGES.scheduleTooLong(schedule.length);
  }
  const notes = draft.notes.trim();
  if (notes.length > CONTACT_CHANNEL_LIMITS.notes) {
    errors.notes = CONTACT_CHANNEL_MESSAGES.notesTooLong(notes.length);
  }
  return errors;
}

/** The channels as the request carries them: trimmed, with a blank schedule or notes sent as null. */
export function toContactChannelBodies(drafts: ContactChannelDraft[]): ContactChannelBody[] {
  return drafts.map((draft) => ({
    type: draft.type,
    label: draft.label.trim(),
    value: draft.value.trim(),
    schedule: draft.schedule.trim() || null,
    notes: draft.notes.trim() || null,
  }));
}

/** Stored channels as the editor starts from them. */
export function toContactChannelDrafts(channels: ContactChannelResponse[]): ContactChannelDraft[] {
  return channels.map((channel) => ({
    type: channel.type,
    label: channel.label,
    value: channel.value,
    schedule: channel.schedule ?? "",
    notes: channel.notes ?? "",
  }));
}

/**
 * The length a field has in what was sent, for a refusal that names the limit
 * but not the current length. Measured after trimming, as the backend does.
 */
export function sentFieldLength(draft: ContactChannelDraft, field: ContactChannelField): number {
  return field === "type" ? 0 : draft[field].trim().length;
}

/** A channel added by the admin: a phone, with nothing filled in yet. */
export function blankContactChannel(): ContactChannelDraft {
  return { type: "PHONE", label: "", value: "", schedule: "", notes: "" };
}
