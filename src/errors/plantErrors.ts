import { getFirstApiErrorCode, getFirstApiErrorMessage } from "./apiErrorCatalogue";

/** Where a refused plant create or edit is shown: on the CIL input, or for the whole form. */
export type PlantSaveRefusal = { field: "cil"; message: string } | { form: string };

/**
 * A refusal about the CIL goes on the CIL input with its catalogue text
 * (UI-ERR-002); any other refusal keeps the form's handling: the catalogue's
 * text, the server's message, or `generic` without an error detail (UI-ERR-005).
 */
export function plantSaveRefusalOf(error: unknown, generic: string): PlantSaveRefusal {
  const code = getFirstApiErrorCode(error);
  if (code === "PLANT_CIL_INVALID" || code === "PLANT_CIL_ALREADY_IN_USE") {
    return { field: "cil", message: getFirstApiErrorMessage(error, generic) };
  }
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
