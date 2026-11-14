import { getFirstApiErrorCode, getFirstApiErrorField, getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import { addressTooLongMessage } from "../../errors/fieldTooLong";

/** The community form's inputs an API refusal can name. */
export type CommunityField = "code" | "legalId" | "address";

export type CommunityRefusal = { field: CommunityField; message: string } | { form: string };

/** The inputs COMMUNITY_ALREADY_EXISTS can name. */
const isUniqueField = (value: string | undefined): value is "code" | "legalId" =>
  value === "code" || value === "legalId";

/**
 * Where a refused community create or edit is shown (#232). COMMUNITY_ALREADY_EXISTS
 * goes on the input its `field` names; without a known field, its catalogue text
 * goes where the page shows errors. FIELD_TOO_LONG goes on the address input
 * when it names the address (#411). Every other refusal keeps the page's own
 * `generic` message.
 */
export function communityRefusalOf(error: unknown, generic: string): CommunityRefusal {
  const addressTooLong = addressTooLongMessage(error, generic);
  if (addressTooLong) return { field: "address", message: addressTooLong };
  if (getFirstApiErrorCode(error) !== "COMMUNITY_ALREADY_EXISTS") return { form: generic };
  const message = getFirstApiErrorMessage(error, generic);
  const field = getFirstApiErrorField(error);
  return isUniqueField(field) ? { field, message } : { form: message };
}

/** Whether a failed community read was the API saying the community is not there for this caller. */
export const isNotFoundError = (error: unknown): boolean =>
  (error as { response?: { status?: number } } | null)?.response?.status === 404;
