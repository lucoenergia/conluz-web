/**
 * Parses a decimal number typed with either a Spanish decimal comma or a
 * plain dot, tolerating dot-grouped thousands separators (e.g. "1.234,5").
 *
 * - If the string contains a comma, every dot before it is a thousands
 *   separator and is stripped; the comma becomes the decimal point.
 * - If the string contains no comma, a dot (if present) is treated as the
 *   decimal point as-is — the iOS decimal keypad can emit either separator
 *   depending on device locale settings.
 *
 * Returns NaN for anything that still doesn't parse as a number.
 */
export function parseDecimalInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return NaN;
  if (trimmed.includes(",")) {
    return Number(trimmed.replace(/\./g, "").replace(",", "."));
  }
  return Number(trimmed);
}

/** Formats a number back for display in the input, using the Spanish decimal comma. */
export function formatDecimalForInput(value: number): string {
  return String(value).replace(".", ",");
}
