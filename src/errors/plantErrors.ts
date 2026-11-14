import { getFirstApiErrorCode, getFirstApiErrorMessage } from "./apiErrorCatalogue";
import { addressTooLongMessage } from "./fieldTooLong";

/** The plant inputs a refusal can be shown on. */
export type PlantSaveRefusalField = "cil" | "address";

/** Where a refused plant create or edit is shown: on the input it is about, or for the whole form. */
export type PlantSaveRefusal = { field: PlantSaveRefusalField; message: string } | { form: string };

/**
 * A refusal about the CIL goes on the CIL input, and FIELD_TOO_LONG on the
 * address input when it names the address (#411), with its catalogue text
 * (UI-ERR-002); any other refusal keeps the form's handling: the catalogue's
 * text, the server's message, or `generic` without an error detail (UI-ERR-005).
 */
export function plantSaveRefusalOf(error: unknown, generic: string): PlantSaveRefusal {
  const code = getFirstApiErrorCode(error);
  if (code === "PLANT_CIL_INVALID" || code === "PLANT_CIL_ALREADY_IN_USE") {
    return { field: "cil", message: getFirstApiErrorMessage(error, generic) };
  }
  const addressTooLong = addressTooLongMessage(error, generic);
  if (addressTooLong) return { field: "address", message: addressTooLong };
  return { form: getFirstApiErrorMessage(error, generic) };
}

const DELETE_FAILED = "Ha habido un problema al eliminar la planta. Por favor inténtalo más tarde";

/**
 * What a refused plant deletion says (#290). A plant that holds the
 * community's sharing history must be kept, so its refusal suggests no retry;
 * any other failure keeps the generic message.
 */
export function plantDeletionRefusalMessage(error: unknown): string {
  const code = getFirstApiErrorCode(error);
  if (code === "PLANT_HAS_SHARING_AGREEMENTS" || code === "PLANT_HAS_PARTITION_COEFFICIENTS") {
    return getFirstApiErrorMessage(error, DELETE_FAILED);
  }
  return DELETE_FAILED;
}
