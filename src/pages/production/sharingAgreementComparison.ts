import type {
  PartitionCoefficientResponse,
  SharingAgreementPartitionCoefficientResponse,
  SharingAgreementReferenceResponse,
} from "../../api/models";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { isUnsavedCoefficientRow, isValidCoefficientValue } from "./sharingAgreementCoefficientEditing";
import { computeCoefficientDelta, formatCoefficientPercentage } from "./sharingAgreementCoefficientSums";

/**
 * Pure rules behind the DRAFT comparison in the "Reparto" section: what each
 * draft row would replace, which supplies the draft drops, and which
 * agreement(s) the comparison is made against.
 *
 * "In force" always means the coefficient the distributor is applying today,
 * whichever agreement authored it. During an activation transition those can
 * come from different agreements and need not sum to 100 %; nothing here
 * normalises them.
 */

/** A coefficient in force for one supply, and the agreement that authored it. */
export interface InForceCoefficient {
  coefficient: number;
  sharingAgreement: SharingAgreementReferenceResponse;
}

/**
 * What a draft row is compared against.
 *
 * - `unknown`: a row added in this editing session whose supply cannot be
 *   looked up yet (active coefficients still loading, or failed). Saying
 *   "nothing in force" would be a claim nobody has checked.
 * - `none`: the supply genuinely has no coefficient in force in this plant.
 * - `present`: the coefficient in force.
 */
export type RowInForce =
  | { kind: "unknown" }
  | { kind: "none" }
  | { kind: "present"; inForce: InForceCoefficient };

/**
 * A saved row carries the server's own answer in `currentCoefficient`. A row
 * the admin added during this session has no server answer, so its supply is
 * looked up in the plant's active coefficients instead. That lookup is what
 * lets a supply re-added from "Salen del reparto" show its in-force value
 * rather than claiming to be new.
 */
export function resolveRowInForce(
  row: SharingAgreementPartitionCoefficientResponse,
  activeBySupplyId: ReadonlyMap<string, PartitionCoefficientResponse> | undefined,
): RowInForce {
  if (!isUnsavedCoefficientRow(row)) {
    const current = row.currentCoefficient;
    return current
      ? { kind: "present", inForce: { coefficient: current.coefficient, sharingAgreement: current.sharingAgreement } }
      : { kind: "none" };
  }
  if (!activeBySupplyId) return { kind: "unknown" };
  const active = row.supply?.id ? activeBySupplyId.get(row.supply.id) : undefined;
  return active
    ? { kind: "present", inForce: { coefficient: active.coefficient, sharingAgreement: active.sharingAgreement } }
    : { kind: "none" };
}

/**
 * The plant's active coefficients whose supply has no row in the draft: the
 * supplies this draft would drop from the distribution. Keeps the endpoint's
 * order (CUPS ascending).
 */
export function findOutgoingCoefficients(
  active: readonly PartitionCoefficientResponse[],
  draftSupplyIds: ReadonlySet<string>,
): PartitionCoefficientResponse[] {
  return active.filter((coefficient) => !draftSupplyIds.has(coefficient.supply.id));
}

export type ComparisonContext =
  | { kind: "none" }
  | { kind: "single"; agreement: SharingAgreementReferenceResponse }
  | { kind: "multiple" };

/**
 * Which agreement(s) the comparison is made against: the authors of the rows'
 * in-force coefficients plus the authors of the outgoing ones. Naming a single
 * agreement is only true when every in-force coefficient comes from it.
 */
export function resolveComparisonContext(
  rowAgreements: readonly (SharingAgreementReferenceResponse | null | undefined)[],
  outgoing: readonly PartitionCoefficientResponse[],
): ComparisonContext {
  const agreements = new Map<string, SharingAgreementReferenceResponse>();
  for (const agreement of rowAgreements) {
    if (agreement) agreements.set(agreement.id, agreement);
  }
  for (const coefficient of outgoing) {
    agreements.set(coefficient.sharingAgreement.id, coefficient.sharingAgreement);
  }
  if (agreements.size === 0) return { kind: "none" };
  if (agreements.size === 1) return { kind: "single", agreement: agreements.values().next().value! };
  return { kind: "multiple" };
}

const PERCENTAGE_POINT_DECIMALS = 4;
const PERCENTAGE_POINT_FACTOR = 10 ** PERCENTAGE_POINT_DECIMALS;

/**
 * A 0-1 difference as signed percentage points, e.g. `-0,9921 p.p.`.
 *
 * Percentage points, not a percentage: the draft moving from 4,1667 % to
 * 3,1746 % is a change of 0,9921 points, and a `%` suffix read as a relative
 * change of that size.
 *
 * Returns `null` when the difference rounds to zero at the displayed
 * precision. The zero check and the formatter read the same rounded value, so
 * a difference too small to show can never render as `+0,0000 p.p.` or
 * `-0,0000 p.p.`.
 */
export function formatPercentagePointDelta(delta: number): string | null {
  const rounded = Math.round(delta * 100 * PERCENTAGE_POINT_FACTOR) / PERCENTAGE_POINT_FACTOR;
  if (rounded === 0 || !Number.isFinite(rounded)) return null;
  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: PERCENTAGE_POINT_DECIMALS,
    maximumFractionDigits: PERCENTAGE_POINT_DECIMALS,
    signDisplay: "exceptZero",
  }).format(rounded);
  return `${formatted} p.p.`;
}

/**
 * `Vigente 4,1667 % · -0,9921 p.p.`, the delta being draft minus in force.
 *
 * The delta is left out when there is no change at the displayed precision,
 * and while the draft value is empty or invalid mid-edit: the in-force value
 * is still the reference the admin needs while typing.
 */
export function formatInForceCoefficientLine(inForceCoefficient: number, draftValue: number | undefined): string {
  const base = `Vigente ${formatCoefficientPercentage(inForceCoefficient)}`;
  if (!isValidCoefficientValue(draftValue)) return base;
  const delta = computeCoefficientDelta(draftValue, inForceCoefficient);
  const formattedDelta = delta === null ? null : formatPercentagePointDelta(delta);
  return formattedDelta ? `${base} · ${formattedDelta}` : base;
}

/**
 * Power assigned by an in-force coefficient. Always computed with the
 * `installedPowerKw` of the agreement that authored it, never the draft's:
 * the two can differ, and mixing them would misstate what is assigned today.
 */
export function computeInForcePowerKw(coefficient: number, installedPowerKw: number | undefined): number | null {
  if (installedPowerKw === undefined || !Number.isFinite(installedPowerKw)) return null;
  return coefficient * installedPowerKw;
}

/** State of the GET for the agreement an in-force coefficient came from. */
export type InForceAgreementPower =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; installedPowerKw: number | undefined };

/**
 * `Vigente 2,62 kW`, or `Vigente —` when the authoring agreement could not be
 * read. `null` while it is loading, so the caller can hold the line's space.
 */
export function formatInForcePowerLine(inForceCoefficient: number, power: InForceAgreementPower): string | null {
  if (power.status === "loading") return null;
  const kw = power.status === "success" ? computeInForcePowerKw(inForceCoefficient, power.installedPowerKw) : null;
  return kw === null ? "Vigente —" : `Vigente ${formatKilowatts(kw)}`;
}

/**
 * Everything a draft row renders about the comparison, resolved by the
 * container so the row stays presentational. The draft side of the delta is
 * left to the row, because while editing it is whatever is in the field.
 */
export type RowComparisonView =
  | { kind: "unknown" }
  | { kind: "new" }
  | { kind: "inForce"; coefficient: number; power: InForceAgreementPower };

export function buildRowComparisonView(
  inForce: RowInForce,
  powerByAgreementId: ReadonlyMap<string, InForceAgreementPower>,
): RowComparisonView {
  if (inForce.kind === "unknown") return { kind: "unknown" };
  if (inForce.kind === "none") return { kind: "new" };
  return {
    kind: "inForce",
    coefficient: inForce.inForce.coefficient,
    power: powerByAgreementId.get(inForce.inForce.sharingAgreement.id) ?? { status: "loading" },
  };
}
