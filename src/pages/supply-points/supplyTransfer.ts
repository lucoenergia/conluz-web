import type { RestErrorDetailCode } from "../../api/models";
import { getFirstApiErrorCode, getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import { membershipStatusOf, STATUS_LABELS, type MembershipStatusFields } from "../members/membershipStatus";

/** What a transfer changes, said before it is sent (UI-SUP-026). */
export const TRANSFER_CONSEQUENCES = [
  "El nuevo titular verá todo el histórico de este punto: consumo, ahorro y coeficientes.",
  "El titular anterior dejará de ver este punto y sus cifras dejarán de incluirlo, también las de meses pasados.",
  "Para que sigan llegando sus datos, el nuevo titular debe autorizar a la comunidad en Datadis.",
  "La inversión no se traspasa. Si corresponde, regístrala en la ficha del nuevo titular.",
] as const;

/** The transfer's inputs an API refusal can name. */
export type SupplyTransferField = "owner" | "date";

export type SupplyTransferRefusal = { field: SupplyTransferField; message: string } | { form: string };

/** The refusals about the date the holder changed (lucoenergia/conluz#585). */
const DATE_CODES: readonly RestErrorDetailCode[] = [
  "SUPPLY_TRANSFER_DATE_IN_FUTURE",
  "SUPPLY_TRANSFER_DATE_NOT_AFTER_PREVIOUS",
];

/** The refusals about the member chosen as the new owner. */
const OWNER_CODES: readonly RestErrorDetailCode[] = ["SUPPLY_ALREADY_OWNED_BY_USER", "SUPPLY_OWNER_NOT_FOUND"];

/**
 * Where a refused transfer is shown (UI-SUP-027): a date refusal on the date
 * input, an owner refusal on the picker, each with its catalogue text. Every
 * other refusal keeps `generic`.
 */
export function supplyTransferRefusalOf(error: unknown, generic: string): SupplyTransferRefusal {
  const code = getFirstApiErrorCode(error);
  if (code && DATE_CODES.includes(code)) return { field: "date", message: getFirstApiErrorMessage(error, generic) };
  if (code && OWNER_CODES.includes(code)) return { field: "owner", message: getFirstApiErrorMessage(error, generic) };
  return { form: generic };
}

/**
 * The state the transfer picker shows after a member's name (UI-SUP-025): the
 * top-level state of a pending or suspended membership, never a pending
 * sub-state, and nothing for an active one.
 */
export function transferStateLabel(membership: MembershipStatusFields): string | null {
  const { status } = membershipStatusOf(membership);
  return status === "active" ? null : STATUS_LABELS[status];
}

