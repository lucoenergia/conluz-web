import { parseDecimalInput } from "../../utils/parseDecimalInput";

export type InvestmentAmountCheck = { value: number } | { error: string };

const THOUSANDS_SEPARATOR = "Escribe el importe sin puntos de miles, por ejemplo 1500,50.";

/** The largest amount the backend records: `SetMembershipInvestmentBody.investmentEur.maximum` (MEM-038). */
export const MAX_INVESTMENT_EUR = 9_999_999_999.99;

// A dot followed by exactly three final digits reads as a thousands separator
// ("1.500") as easily as a decimal point, so it is refused rather than guessed.
const DOT_THEN_THREE_DIGITS = /\.\d{3}$/;

// Digits, then at most one decimal separator and its digits. Anything else
// Number() would accept ("1e5", "0x10", "Infinity") is not an amount typed in euros.
const PLAIN_NUMBER = /^[-+]?\d+([.,]\d+)?$/;

/**
 * Checks a typed investment amount (#358): greater than zero, at most
 * MAX_INVESTMENT_EUR, at most two decimals, written with a decimal comma or a
 * dot. An amount that could be read
 * two ways, because it carries a thousands separator, is refused before
 * parsing: `parseDecimalInput` would read "1.500,50" as 1500.5, but "1.500"
 * as 1.5.
 */
export function validateInvestmentAmount(raw: string): InvestmentAmountCheck {
  const text = raw.trim();
  if (text === "") return { error: "Indica el importe." };
  if ((text.includes(".") && text.includes(",")) || DOT_THEN_THREE_DIGITS.test(text)) {
    return { error: THOUSANDS_SEPARATOR };
  }

  const value = PLAIN_NUMBER.test(text) ? parseDecimalInput(text) : NaN;
  if (!Number.isFinite(value)) return { error: "Escribe solo un número, por ejemplo 1500,50." };
  if (value <= 0) return { error: "El importe debe ser mayor que cero." };

  // Counted on the text, never on the float, which cannot tell 0.1 from 0.1000000001.
  const decimals = text.split(/[.,]/)[1] ?? "";
  if (decimals.length > 2) return { error: "Usa como mucho dos decimales." };
  if (value > MAX_INVESTMENT_EUR) return { error: "El importe no puede superar 9.999.999.999,99 €." };

  return { value };
}
