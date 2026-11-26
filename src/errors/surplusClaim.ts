/**
 * The surplus claim's words, shared by its page and the error catalogue
 * (#455). A leaf module, importing nothing, so the catalogue can use it
 * without a cycle.
 */

/** Why the claimable months stop where they do: the month selector's helper. */
export const SURPLUS_CLAIM_CLOSED_MONTHS_MESSAGE =
  "Solo meses cerrados. La distribuidora publica cada mes hacia el día 10 del siguiente.";

/** The backend's `SURPLUS_CLAIM_MONTH_NOT_CLOSED`: what happened, for a caller that shows the refusal. */
export const SURPLUS_CLAIM_MONTH_NOT_CLOSED_MESSAGE =
  "Ese mes todavía no ha terminado. Solo se pueden reclamar meses cerrados.";

/** The notice that replaces Endesa's download, and the backend's `SURPLUS_CLAIM_CIL_REQUIRED`. */
export const SURPLUS_CLAIM_CIL_REQUIRED_MESSAGE =
  "Falta el CIL de la planta. Endesa lo necesita para identificar la instalación.";
