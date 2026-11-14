import type { RestErrorDetailCode } from "../../api/models";
import { getFirstApiErrorCode, getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import { addressTooLongMessage } from "../../errors/fieldTooLong";

/** The supply form's inputs an API refusal can name. */
export type SupplyField = "cups" | "personalId" | "address";

export type SupplyRefusal = { field: SupplyField; message: string } | { form: string };

/** The refusals about the CUPS the admin typed (lucoenergia/conluz#532). */
const CUPS_CODES: readonly RestErrorDetailCode[] = [
  "SUPPLY_CUPS_INVALID",
  "SUPPLY_ALREADY_EXISTS",
  "SUPPLY_REGISTERED_IN_ANOTHER_COMMUNITY",
];

/**
 * Where a refused supply create or edit is shown. A refusal about the CUPS
 * goes on the CUPS input, SUPPLY_OWNER_NOT_FOUND on the owner input when
 * the form lets the admin choose one, and FIELD_TOO_LONG on the address input
 * when it names the address (#411), each with its catalogue text. Every other
 * refusal keeps the page's own `generic` message.
 */
export function supplyRefusalOf(error: unknown, generic: string, { ownerField }: { ownerField: boolean }): SupplyRefusal {
  const code = getFirstApiErrorCode(error);
  if (code && CUPS_CODES.includes(code)) return { field: "cups", message: getFirstApiErrorMessage(error, generic) };
  if (code === "SUPPLY_OWNER_NOT_FOUND" && ownerField) {
    return { field: "personalId", message: getFirstApiErrorMessage(error, generic) };
  }
  const addressTooLong = addressTooLongMessage(error, generic);
  if (addressTooLong) return { field: "address", message: addressTooLong };
  return { form: generic };
}
