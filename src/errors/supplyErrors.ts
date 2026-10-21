import { getFirstApiErrorCode, getFirstApiErrorMessage } from "./apiErrorCatalogue";

/**
 * Why deleting a supply was refused (#290).
 *
 * - `has-plants`: SUPPLY_HAS_PLANTS. A plant is attached to it.
 * - `has-coefficients`: SUPPLY_HAS_PARTITION_COEFFICIENTS. A sharing agreement
 *   holds coefficients for it.
 * - `forbidden`: a 403.
 * - `not-found`: a 404. The supply is already gone, so the reads that showed it
 *   are refreshed, and the message says so.
 *
 * Anything else is `other`.
 */
export type SupplyDeletionRefusal = "has-plants" | "has-coefficients" | "forbidden" | "not-found" | "other";

export function supplyDeletionRefusal(error: unknown): SupplyDeletionRefusal {
  const code = getFirstApiErrorCode(error);
  if (code === "SUPPLY_HAS_PLANTS") return "has-plants";
  if (code === "SUPPLY_HAS_PARTITION_COEFFICIENTS") return "has-coefficients";
  const status = (error as { response?: { status?: number } } | null | undefined)?.response?.status;
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  return "other";
}

const MESSAGES: Record<Exclude<SupplyDeletionRefusal, "has-plants" | "has-coefficients">, string> = {
  forbidden: "No tienes permiso para eliminar este punto de suministro.",
  "not-found": "Este punto de suministro ya no existe. Hemos actualizado la lista.",
  other: "No se ha podido eliminar el punto de suministro. Inténtalo de nuevo.",
};

/** What a refused supply deletion says. The two 409s are worded by the catalogue. */
export function supplyDeletionRefusalMessage(error: unknown): string {
  const refusal = supplyDeletionRefusal(error);
  if (refusal === "has-plants" || refusal === "has-coefficients") {
    return getFirstApiErrorMessage(error, MESSAGES.other);
  }
  return MESSAGES[refusal];
}
