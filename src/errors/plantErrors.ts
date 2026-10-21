import { getFirstApiErrorCode, getFirstApiErrorMessage } from "./apiErrorCatalogue";

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
