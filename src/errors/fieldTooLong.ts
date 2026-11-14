import { getFirstApiErrorCode, getFirstApiErrorField, getFirstApiErrorMessage } from "./apiErrorCatalogue";

/**
 * The catalogue's text for a refusal whose first error detail is
 * FIELD_TOO_LONG on the address (#411), for a form to show on its address
 * input (UI-ERR-002); `undefined` for any other refusal.
 */
export function addressTooLongMessage(error: unknown, fallback: string): string | undefined {
  if (getFirstApiErrorCode(error) !== "FIELD_TOO_LONG" || getFirstApiErrorField(error) !== "address") return undefined;
  return getFirstApiErrorMessage(error, fallback);
}
