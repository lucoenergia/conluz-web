import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse, SupplyResponse } from "../../api/models";
import { formatDecimalForInput, parseDecimalInput } from "../../utils/parseDecimalInput";

export type CoefficientInputUnit = "percentage" | "kw";

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

/**
 * Raw text (already expressed in `unit`) -> canonical 0-1 value. No rounding
 * beyond plain division — storage stays full-precision; rounding only ever
 * happens when formatting a value back to display text. NaN (never 0) for
 * empty/unparseable text, or for kW text when installedPowerKw is missing or
 * non-positive — an unusable conversion, not a silent zero.
 */
export function parseCoefficientInput(
  raw: string,
  unit: CoefficientInputUnit,
  installedPowerKw: number | undefined,
): number {
  const parsed = parseDecimalInput(raw);
  if (unit === "percentage") return parsed;
  if (installedPowerKw === undefined || installedPowerKw <= 0) return NaN;
  return parsed / installedPowerKw;
}

/**
 * Canonical 0-1 value -> display text in `unit`. Always fed the row's
 * still-precise `value`, never a previously-formatted string, so
 * rounding-for-display never compounds across repeated toggles. kW text is
 * rounded to 4dp for readability — a display-only choice with no correctness
 * consequence, since a toggle always re-derives from `value`, never from this
 * rounded text.
 */
export function formatCoefficientForInput(
  value: number | undefined,
  unit: CoefficientInputUnit,
  installedPowerKw: number | undefined,
): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  if (unit === "percentage") return formatDecimalForInput(value);
  if (installedPowerKw === undefined || installedPowerKw <= 0) return "";
  const kw = Math.round(value * installedPowerKw * 10_000) / 10_000;
  return formatDecimalForInput(kw);
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
    .map((coefficient) => ({
      // Supply's id is the PUT's join key — never the coefficientId. Guarded above.
      supplyId: coefficient.supply!.id!,
      coefficient,
      value: coefficient.coefficient,
      inputText: formatCoefficientForInput(coefficient.coefficient, unit, installedPowerKw),
    }));
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
