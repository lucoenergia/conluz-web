import { getFirstApiErrorCode, getFirstApiErrorMessage } from "./apiErrorCatalogue";

/** The agreement inputs a refusal can be shown on. */
export type SharingAgreementSaveRefusalField = "distributorFileSentOn";

/** Where a refused agreement edit is shown: on the input it is about, or for the whole form. */
export type SharingAgreementSaveRefusal = { field: SharingAgreementSaveRefusalField; message: string } | { form: string };

/**
 * A distributor file sent date in the future goes on the date input, with its
 * catalogue text (#417); any other refusal keeps the form's handling: the
 * catalogue's text, the server's message, or `generic` without an error detail.
 */
export function sharingAgreementSaveRefusalOf(error: unknown, generic: string): SharingAgreementSaveRefusal {
  if (getFirstApiErrorCode(error) === "SHARING_AGREEMENT_DISTRIBUTOR_FILE_SENT_ON_IN_FUTURE") {
    return { field: "distributorFileSentOn", message: getFirstApiErrorMessage(error, generic) };
  }
  return { form: getFirstApiErrorMessage(error, generic) };
}
