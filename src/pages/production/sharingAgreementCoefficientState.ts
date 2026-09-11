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

/** The single definition of "pending" — never copy `=== PENDING` a second time; getAvailableCoefficientActions reads this one. */
function isPendingState(applicationState: SharingAgreementPartitionCoefficientResponseApplicationState | undefined): boolean {
  return applicationState === PENDING;
}

export type CoefficientAction = "apply" | "correct" | "deactivate" | "close" | "reopen";

/**
 * Identifies a coefficient by CUPS, never the raw supply UUID — most rows in
 * real data have no supply name, and a dialog naming a UUID tells the admin
 * nothing about which real-world point is affected.
 */
export function getCoefficientCupsLabel(coefficient: SharingAgreementPartitionCoefficientResponse | undefined): string {
  if (!coefficient?.supply) return "";
  return coefficient.supply.name ? `${coefficient.supply.name} (CUPS ${coefficient.supply.code})` : `CUPS ${coefficient.supply.code}`;
}

/**
 * The row-menu actions available for a coefficient, as two independent axes:
 * a PENDING coefficient offers only "apply" (registering its first
 * application date — the same activate endpoint "correct" uses later).
 * Once APPLIED, applicationState gates "correct"/"deactivate", and endState
 * separately gates the end-of-coverage action. Never widen the endState
 * table below: OPEN is deliberately excluded even though the backend
 * accepts closing an active coefficient. DRAFT safety no longer falls out
 * of this function alone (a DRAFT coefficient is PENDING and now gets
 * "apply" too) — every consumer must gate on `!isDraft` itself.
 */
export function getAvailableCoefficientActions(
  applicationState: SharingAgreementPartitionCoefficientResponseApplicationState | undefined,
  endState: SharingAgreementPartitionCoefficientResponseEndState | undefined,
): CoefficientAction[] {
  if (isPendingState(applicationState)) return ["apply"];
  if (applicationState !== APPLIED) return [];

  const actions: CoefficientAction[] = ["correct", "deactivate"];
  if (endState === OPEN_ORPHAN) actions.push("close");
  else if (endState === CLOSED) actions.push("reopen");
  return actions;
}

// The single canonical ordering for every surface that lists more than one
// CoefficientAction (the row menu's divider placement, the batch summary
// above). Never derived from a single getAvailableCoefficientActions call:
// no coefficient ever carries both "apply" and "correct", or "close" and
// "reopen", at once, so only a fixed, domain-wide list can express their
// relative order for a mixed *selection*.
const ACTION_ORDER: readonly CoefficientAction[] = ["apply", "correct", "deactivate", "close", "reopen"];

export interface SelectionActionAvailability {
  action: CoefficientAction;
  /** How many selected coefficients support this action. */
  eligibleCount: number;
  /** The full selection size — travels alongside eligibleCount so a caller never divides it by a total taken from a different collection (e.g. the visible rows). */
  selectedCount: number;
}

/**
 * Summarises which actions a selection of coefficients can act on together,
 * and how many of the selection each one actually covers. Built strictly on
 * top of getAvailableCoefficientActions — this is not a second predicate,
 * just an aggregation over it. Actions no selected coefficient supports are
 * omitted entirely, never reported at eligibleCount: 0.
 */
export function summarizeSelectionActions(
  selected: readonly Pick<SharingAgreementPartitionCoefficientResponse, "applicationState" | "endState">[],
): SelectionActionAvailability[] {
  const selectedCount = selected.length;
  const eligibleCounts = new Map<CoefficientAction, number>();
  for (const coefficient of selected) {
    for (const action of getAvailableCoefficientActions(coefficient.applicationState, coefficient.endState)) {
      eligibleCounts.set(action, (eligibleCounts.get(action) ?? 0) + 1);
    }
  }
  return ACTION_ORDER.filter((action) => (eligibleCounts.get(action) ?? 0) > 0).map((action) => ({
    action,
    eligibleCount: eligibleCounts.get(action)!,
    selectedCount,
  }));
}

/** True only when every selected coefficient supports the action — never when the selection is empty, since eligibleCount: 0 items are never reported at all. */
export function isFullyAvailable(item: SelectionActionAvailability): boolean {
  return item.eligibleCount === item.selectedCount;
}
