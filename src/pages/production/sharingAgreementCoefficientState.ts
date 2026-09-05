import type { ChipProps } from "@mui/material";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { formatCalendarDate } from "../../utils/formatCalendarDate";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, OPEN_ORPHAN, PENDING_SUCCESSION, DERIVED, CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;

/**
 * Compact applicationState label used by the filter chips ("Todos / Sin
 * aplicar / En vigor"). The row/card use `getApplicationStateHeadline`
 * instead, which carries the fuller, actor-naming copy.
 */
export function getApplicationStateLabel(
  state: SharingAgreementPartitionCoefficientResponseApplicationState | undefined,
): string {
  switch (state) {
    case PENDING:
      return "Sin aplicar";
    case APPLIED:
      return "En vigor";
    default:
      return "-";
  }
}

/**
 * Row/card headline for applicationState. Names the distributor as the actor
 * who applies the coefficient out in the world — the admin only records that
 * fact afterward, never "processes" or "pends" it themselves.
 */
export function getApplicationStateHeadline(coefficient: SharingAgreementPartitionCoefficientResponse): string {
  switch (coefficient.applicationState) {
    case PENDING:
      return "Sin fecha de aplicación";
    case APPLIED:
      return coefficient.validFrom ? `En vigor desde ${formatCalendarDate(coefficient.validFrom)}` : "En vigor";
    default:
      return "-";
  }
}

/**
 * Semantic chip color for the applicationState filter/badge: PENDING still
 * needs attention (warning), APPLIED is done (success).
 */
export function getApplicationStateColor(
  state: SharingAgreementPartitionCoefficientResponseApplicationState | undefined,
): ChipProps["color"] {
  switch (state) {
    case PENDING:
      return "warning";
    case APPLIED:
      return "success";
    default:
      return "default";
  }
}

/**
 * Secondary caption shown under the headline. PENDING tells the admin what
 * to do and that the trigger is external (the distributor applies it, the
 * admin only registers it). APPLIED has nothing left to say once its date
 * moved into the headline — `undefined` states "no caption" unambiguously,
 * unlike an empty string a caller might render or measure unchecked.
 */
export function getApplicationStateDetail(
  coefficient: SharingAgreementPartitionCoefficientResponse,
): string | undefined {
  switch (coefficient.applicationState) {
    case PENDING:
      return "Regístrala cuando la distribuidora lo aplique";
    case APPLIED:
      return undefined;
    default:
      return "-";
  }
}

/**
 * Translates the backend-computed endState enum into a label. Never derived
 * from comparing this coefficient's dates against another's — the enum is
 * the sole source of truth.
 */
export function getEndStateLabel(coefficient: SharingAgreementPartitionCoefficientResponse): string {
  switch (coefficient.endState) {
    case OPEN:
      return "—";
    case OPEN_ORPHAN:
      return "Sin cerrar";
    case PENDING_SUCCESSION:
      return "Pendiente del siguiente acuerdo";
    case DERIVED:
    case CLOSED:
      return formatCalendarDate(coefficient.endDate ?? undefined);
    default:
      return "—";
  }
}

/**
 * DERIVED and PENDING_SUCCESSION are computed by the backend, not authored —
 * callers must render them with a visibly muted, read-only treatment.
 */
export function isEndStateReadOnly(
  endState: SharingAgreementPartitionCoefficientResponseEndState | undefined,
): boolean {
  return endState === DERIVED || endState === PENDING_SUCCESSION;
}
