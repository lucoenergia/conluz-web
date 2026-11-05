import { describe, expect, it } from "vitest";
import { validateInvestmentAmount } from "./investmentAmount";

const THOUSANDS = "Escribe el importe sin puntos de miles, por ejemplo 1500,50.";
const NOT_A_NUMBER = "Escribe solo un número, por ejemplo 1500,50.";

describe("validateInvestmentAmount", () => {
  it.each([
    ["1500,50", 1500.5],
    ["1500.5", 1500.5],
    ["1500", 1500],
    ["0,01", 0.01],
    [" 25,5 ", 25.5],
  ])("UI-MBR-045 accepts %j as %d", (typed, value) => {
    expect(validateInvestmentAmount(typed)).toEqual({ value });
  });

  it.each([
    ["", "Indica el importe."],
    ["   ", "Indica el importe."],
    ["0", "El importe debe ser mayor que cero."],
    ["0,00", "El importe debe ser mayor que cero."],
    ["-5", "El importe debe ser mayor que cero."],
    ["1,234", "Usa como mucho dos decimales."],
    ["10.555", THOUSANDS],
    ["1.500", THOUSANDS],
    ["12.000", THOUSANDS],
    ["1.500,50", THOUSANDS],
    ["1,500.50", THOUSANDS],
    ["abc", NOT_A_NUMBER],
    ["1e5", NOT_A_NUMBER],
    ["0x10", NOT_A_NUMBER],
    ["Infinity", NOT_A_NUMBER],
    ["12,", NOT_A_NUMBER],
    ["1 500", NOT_A_NUMBER],
  ])("UI-MBR-045 refuses %j: %s", (typed, error) => {
    expect(validateInvestmentAmount(typed)).toEqual({ error });
  });
});
