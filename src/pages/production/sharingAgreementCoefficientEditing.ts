import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse, SupplyResponse } from "../../api/models";
import { formatFixedDecimalForInput, parseDecimalInput } from "../../utils/parseDecimalInput";
import { COEFFICIENT_SCALE, toIntegerUnits } from "./sharingAgreementCoefficientSums";

export type CoefficientInputUnit = "coefficient" | "kw";

/**
 * A row in the manual coefficient editor. `coefficient` carries display-only
 * fields (supply name/code, application/end state) — for a row seeded from
 * an existing GET entry it's the real response; for a newly picked supply
 * it's synthesized as a pending, open entry, since that's what it will be
 * once saved.
 *
 * `value` is the canonical 0-1 coefficient and the SINGLE source of truth —
 * `inputText` (whatever unit is currently active) is a view of it, never the
 * other way round except when the admin actually edits. A unit toggle only
 * ever regenerates `inputText` from `value`; it never re-derives `value` from
 * the previously-displayed text. That asymmetry is what makes toggling units
 * lossless: `value` is untouched by a toggle, so toggling back reproduces the
 * exact original text, byte for byte.
 */
export interface EditableCoefficientRow {
  supplyId: string;
  coefficient: SharingAgreementPartitionCoefficientResponse;
  value: number | undefined;
  inputText: string;
}

/** Rounds a 0-1 value to the nearest millionth, reusing the sum module's own integer-scale rounding. */
function toMillionths(value: number): number {
  return toIntegerUnits(value) / COEFFICIENT_SCALE;
}

/**
 * Raw text (already expressed in `unit`) -> canonical 0-1 value, rounded to
 * the nearest millionth immediately, once — this IS the canonical value, and
 * nothing downstream re-derives or re-rounds it. Rounding here (rather than
 * only at display time) is what guarantees the save payload is always an
 * exact multiple of 1e-6, matching the distributor file's precision: a plain
 * `kw / installedPowerKw` division produces an arbitrary-precision float, and
 * without rounding at the point of conversion that float reaches the server
 * verbatim. NaN (never 0) for empty/unparseable text, or for kW text when
 * installedPowerKw is missing or non-positive — an unusable conversion, not a
 * silent zero.
 */
export function parseCoefficientInput(
  raw: string,
  unit: CoefficientInputUnit,
  installedPowerKw: number | undefined,
): number {
  const parsed = parseDecimalInput(raw);
  if (unit === "coefficient") return toMillionths(parsed);
  if (installedPowerKw === undefined || installedPowerKw <= 0) return NaN;
  return toMillionths(parsed / installedPowerKw);
}

/**
 * Canonical 0-1 value -> display text in `unit`. Always fed the row's
 * still-precise `value`, never a previously-formatted string, so
 * rounding-for-display never compounds across repeated toggles.
 *
 * Both units are FIXED precision, always padded, never variable-length: the
 * raw 0-1 coefficient at 6dp (matches the backend's own coefficient
 * precision, COEFFICIENT_SCALE = 1e-6 — the read-only percentage display
 * honors this via formatPercentage at its own, distinct 4dp percentage scale;
 * the editable coefficient input must stay fixed at 6dp in every case, not
 * just when the natural float representation happens to be short); kW at 2dp
 * (matches formatKilowatts's convention everywhere else kW is shown). A bare
 * String()-style formatter must never be used here: a kW->coefficient
 * division can produce an arbitrary number of natural decimal digits, and
 * without fixed rounding+padding that leaks straight into the field.
 */
export function formatCoefficientForInput(
  value: number | undefined,
  unit: CoefficientInputUnit,
  installedPowerKw: number | undefined,
): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  if (unit === "coefficient") return formatFixedDecimalForInput(value, 6);
  if (installedPowerKw === undefined || installedPowerKw <= 0) return "";
  const kw = Math.round(value * installedPowerKw * 100) / 100;
  return formatFixedDecimalForInput(kw, 2);
}

/** Unit-independent range check directly on the canonical value. */
export function isValidCoefficientValue(value: number | undefined): boolean {
  return value !== undefined && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function buildEditableRowsFromCoefficients(
  coefficients: SharingAgreementPartitionCoefficientResponse[],
  unit: CoefficientInputUnit,
  installedPowerKw: number | undefined,
): EditableCoefficientRow[] {
  return coefficients
    .filter((coefficient) => !!coefficient.supply?.id)
    .map((coefficient) => {
      // Re-round on load too: a row saved before this rounding existed could
      // still carry a drifted value, and re-saving it untouched must not
      // silently re-propagate that drift. `undefined` stays `undefined`
      // (toIntegerUnits would otherwise default a missing coefficient to 0).
      const value = coefficient.coefficient !== undefined ? toMillionths(coefficient.coefficient) : undefined;
      return {
        // Supply's id is the PUT's join key — never the coefficientId. Guarded above.
        supplyId: coefficient.supply!.id!,
        coefficient,
        value,
        inputText: formatCoefficientForInput(value, unit, installedPowerKw),
      };
    });
}

export function buildEditableRowFromSupply(supply: SupplyResponse): EditableCoefficientRow {
  return {
    supplyId: supply.id!,
    coefficient: {
      supply: { id: supply.id, name: supply.name, code: supply.code },
      applicationState: SharingAgreementPartitionCoefficientResponseApplicationState.PENDING,
      endState: SharingAgreementPartitionCoefficientResponseEndState.OPEN,
    },
    // Empty, never zero — an unset value must block save, not silently count as 0.
    // Unit-independent: an empty row starts empty regardless of which unit is active.
    value: undefined,
    inputText: "",
  };
}

/**
 * A single row's onChange. Stores the typed text VERBATIM — never
 * reformatted — and separately derives `value` via parseCoefficientInput.
 * Never `parsed ?? 0`: empty/unparseable text yields `value: undefined`
 * (blocks save), while "0" yields a real `value: 0` (a legitimate row —
 * e.g. a supply leaving distribution — that reaches the save payload as
 * `coefficient: 0`).
 */
export function updateRowInput(
  rows: EditableCoefficientRow[],
  supplyId: string,
  inputText: string,
  unit: CoefficientInputUnit,
  installedPowerKw: number | undefined,
): EditableCoefficientRow[] {
  return rows.map((row) => {
    if (row.supplyId !== supplyId) return row;
    const parsed = parseCoefficientInput(inputText, unit, installedPowerKw);
    return { ...row, inputText, value: Number.isFinite(parsed) ? parsed : undefined };
  });
}

/**
 * Re-derives EVERY row's displayed text for `toUnit` from its canonical
 * `value` — never re-parses the previous `inputText`. This is the only
 * unit-conversion path used by a toggle; `value` itself is never written
 * here, which is what makes repeated toggles lossless.
 */
export function retextRowsForUnit(
  rows: EditableCoefficientRow[],
  toUnit: CoefficientInputUnit,
  installedPowerKw: number | undefined,
): EditableCoefficientRow[] {
  return rows.map((row) => ({ ...row, inputText: formatCoefficientForInput(row.value, toUnit, installedPowerKw) }));
}
