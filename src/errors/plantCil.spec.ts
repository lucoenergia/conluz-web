import { describe, expect, it } from "vitest";
import { normaliseCil } from "./plantCil";

// 25 ASCII letters and digits, in lower case: what a distributor document may hold.
const CIL = "es0031405000000001ab1f001";
const NORMALISED = "ES0031405000000001AB1F001";
const NBSP = "\u00A0";
const UNIT_SEPARATOR = "\u001F";

/** The CIL as lucoenergia/conluz#567's PlantCil.normalise stores it (#407). */
describe("UI-PLS-009 normaliseCil", () => {
  it("UI-PLS-009 upper-cases a CIL and removes its spaces", () => {
    expect(normaliseCil("es00 3140 5000 0000 01ab 1f00 1")).toEqual({ valid: true, cil: NORMALISED });
  });

  it("UI-PLS-009 removes a no-break space inside the CIL and at both ends", () => {
    expect(normaliseCil(`${NBSP}${CIL.slice(0, 10)}${NBSP}${CIL.slice(10)}${NBSP}`)).toEqual({ valid: true, cil: NORMALISED });
  });

  it("UI-PLS-009 removes tabs, line breaks and the U+001F unit separator, as Java's whitespace does", () => {
    expect(normaliseCil(`\t${CIL.slice(0, 5)}${UNIT_SEPARATOR}${CIL.slice(5, 15)}\n${CIL.slice(15)}\r`)).toEqual({
      valid: true,
      cil: NORMALISED,
    });
  });

  it("UI-PLS-009 reads an empty or blank CIL as none", () => {
    expect(normaliseCil("")).toEqual({ valid: true, cil: undefined });
    expect(normaliseCil(` ${NBSP}\t`)).toEqual({ valid: true, cil: undefined });
  });

  it("UI-PLS-005 refuses a CIL one character short or one too long", () => {
    expect(normaliseCil(CIL.slice(0, 24))).toEqual({ valid: false });
    expect(normaliseCil(`${CIL}0`)).toEqual({ valid: false });
  });

  it("UI-PLS-005 refuses ß, which upper-cases to the two ASCII letters SS", () => {
    // 23 characters and ß upper-case to 25 ASCII ones: a check made after
    // upper-casing would accept the first.
    expect(normaliseCil(`${CIL.slice(0, 23)}ß`)).toEqual({ valid: false });
    expect(normaliseCil(`${CIL.slice(0, 24)}ß`)).toEqual({ valid: false });
  });

  it("UI-PLS-005 refuses Ñ and ñ, which are letters but not ASCII", () => {
    expect(normaliseCil(`${CIL.slice(0, 24)}Ñ`)).toEqual({ valid: false });
    expect(normaliseCil(`${CIL.slice(0, 24)}ñ`)).toEqual({ valid: false });
  });

  it("UI-PLS-005 refuses punctuation", () => {
    expect(normaliseCil(`${CIL.slice(0, 24)}-`)).toEqual({ valid: false });
  });
});
