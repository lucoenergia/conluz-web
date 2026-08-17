import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { formatCalendarDate } from "../../utils/formatCalendarDate";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, OPEN_ORPHAN, PENDING_SUCCESSION, DERIVED, CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;

/**
 * Translates the backend-computed applicationState enum into a label. The
 * frontend never re-derives this state — it only reads it.
 */
export function getApplicationStateLabel(
  state: SharingAgreementPartitionCoefficientResponseApplicationState | undefined,
): string {
  switch (state) {
    case PENDING:
      return "Pendiente de tratamiento";
    case APPLIED:
      return "Aplicado";
    default:
      return "-";
  }
}

/**
 * Secondary readout shown alongside the label: PENDING explains why it
 * doesn't count toward the applied sum yet; APPLIED shows the effective date.
 */
export function getApplicationStateDetail(coefficient: SharingAgreementPartitionCoefficientResponse): string {
  switch (coefficient.applicationState) {
    case PENDING:
      return "Contribuye 0 a la suma aplicada";
    case APPLIED:
      return `Desde ${formatCalendarDate(coefficient.validFrom)}`;
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
      return formatCalendarDate(coefficient.endDate);
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
