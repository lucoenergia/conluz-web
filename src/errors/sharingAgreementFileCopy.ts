/**
 * The missing-CAU rule for the distributor file, shared by the error catalogue,
 * the file panel and the agreement's next step (#149). They used to word it
 * separately and decide it separately: the panel treated a whitespace-only CAU
 * as present while the next step treated it as missing. A leaf module,
 * importing nothing, so the catalogue can use it without a cycle.
 */

export const MISSING_CAU_MESSAGE = "La planta no tiene configurado el CAU. Añádelo desde la ficha de la planta.";

/**
 * Whether the plant has a CAU to build the file with. Trims: the backend
 * refuses to generate with a whitespace-only CAU, so it counts as missing.
 */
export function hasPlantRegulatoryCode(regulatoryCode: string | null | undefined): regulatoryCode is string {
  return !!regulatoryCode?.trim();
}
