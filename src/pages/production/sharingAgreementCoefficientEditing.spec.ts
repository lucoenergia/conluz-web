import { describe, expect, it } from "vitest";
import {
  buildEditableRowFromSupply,
  buildEditableRowsFromCoefficients,
  formatCoefficientForInput,
  isValidCoefficientValue,
  parseCoefficientInput,
  retextRowsForUnit,
  updateRowInput,
  type EditableCoefficientRow,
} from "./sharingAgreementCoefficientEditing";
import { computeSharingAgreementCoefficientSums, COEFFICIENT_SCALE } from "./sharingAgreementCoefficientSums";

describe("buildEditableRowsFromCoefficients", () => {
  it("seeds value from the exact server coefficient and inputText fixed at 6 decimals", () => {
    const rows = buildEditableRowsFromCoefficients(
      [{ coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "CUPS1" }, coefficient: 0.3 }],
      "coefficient",
      100,
    );
    expect(rows).toEqual([
      { supplyId: "s1", coefficient: expect.objectContaining({ coefficientId: "c1" }), value: 0.3, inputText: "0,300000" },
    ]);
  });

  it("seeds an explicit zero coefficient as value 0 and inputText '0,000000', not empty", () => {
    const rows = buildEditableRowsFromCoefficients([{ supply: { id: "s1" }, coefficient: 0 }], "coefficient", 100);
    expect(rows[0].value).toBe(0);
    expect(rows[0].inputText).toBe("0,000000");
  });

  it("seeds kW-unit text derived from value * installedPowerKw, fixed at 2 decimals", () => {
    const rows = buildEditableRowsFromCoefficients([{ supply: { id: "s1" }, coefficient: 0.5 }], "kw", 60);
    expect(rows[0].value).toBe(0.5);
    expect(rows[0].inputText).toBe("30,00");
  });

  it("drops entries with no supply id rather than crashing", () => {
    const rows = buildEditableRowsFromCoefficients([{ supply: undefined, coefficient: 0.5 }], "coefficient", 100);
    expect(rows).toHaveLength(0);
  });

  it("re-rounds a drifted legacy coefficient to 6 decimals on load, so re-saving it untouched can't re-propagate the drift", () => {
    const rows = buildEditableRowsFromCoefficients([{ supply: { id: "s1" }, coefficient: 1 / 3 }], "coefficient", 100);
    expect(rows[0].value).toBe(0.333333);
    expect(rows[0].inputText).toBe("0,333333");
  });

  it("leaves value undefined when the server coefficient is missing, never defaulting it to 0", () => {
    const rows = buildEditableRowsFromCoefficients([{ supply: { id: "s1" }, coefficient: undefined }], "coefficient", 100);
    expect(rows[0].value).toBeUndefined();
  });
});

describe("buildEditableRowFromSupply", () => {
  it("starts with an empty inputText and undefined value, never '0'/0", () => {
    const row = buildEditableRowFromSupply({ id: "s2", name: "Local B", code: "CUPS2" });
    expect(row.inputText).toBe("");
    expect(row.value).toBeUndefined();
    expect(row.supplyId).toBe("s2");
  });
});

describe("parseCoefficientInput", () => {
  it("percentage unit parses directly", () => {
    expect(parseCoefficientInput("0,5", "coefficient", undefined)).toBe(0.5);
  });

  it("kw unit divides by installedPowerKw", () => {
    expect(parseCoefficientInput("30", "kw", 60)).toBe(0.5);
  });

  it("kw unit returns NaN when installedPowerKw is missing or non-positive", () => {
    expect(parseCoefficientInput("30", "kw", undefined)).toBeNaN();
    expect(parseCoefficientInput("30", "kw", 0)).toBeNaN();
  });

  it("empty text is NaN in both units, never 0", () => {
    expect(parseCoefficientInput("", "coefficient", 100)).toBeNaN();
    expect(parseCoefficientInput("", "kw", 100)).toBeNaN();
  });

  it("'0' parses to a real 0 in both units, never NaN", () => {
    expect(parseCoefficientInput("0", "coefficient", 100)).toBe(0);
    expect(parseCoefficientInput("0", "kw", 100)).toBe(0);
  });

  it("rounds a kW division to exactly 6 decimals — the reported defect: 1.5 kW / 48.4 kW installed used to yield 0.030991735537190084", () => {
    const value = parseCoefficientInput("1,5", "kw", 48.4);
    expect(value).toBe(0.030992);
    expect(Number.isInteger(value * COEFFICIENT_SCALE)).toBe(true);
  });

  it("reproduction case: installedPowerKw 48,40 kW with rows of 1,50 / 3,20 / 1,00 / 2,00 kW all round to exact millionths", () => {
    const installedPowerKw = 48.4;
    const values = ["1,5", "3,2", "1,0", "2,0"].map((kw) => parseCoefficientInput(kw, "kw", installedPowerKw));
    expect(values).toEqual([0.030992, 0.066116, 0.020661, 0.041322]);
    values.forEach((value) => expect(Number.isInteger(value * COEFFICIENT_SCALE)).toBe(true));
  });

  it("rounds a percentage-mode value typed with more than 6 decimals, never leaking extra precision into the canonical value", () => {
    expect(parseCoefficientInput("0,0309925", "coefficient", undefined)).toBe(0.030993);
    expect(parseCoefficientInput("0,0309924", "coefficient", undefined)).toBe(0.030992);
  });
});

describe("formatCoefficientForInput", () => {
  it("percentage unit formats fixed at 6 decimals, padding a value with fewer natural digits", () => {
    expect(formatCoefficientForInput(0.123456, "coefficient", undefined)).toBe("0,123456");
    expect(formatCoefficientForInput(0.5, "coefficient", undefined)).toBe("0,500000");
  });

  it("percentage unit rounds a value with more natural digits than 6dp, never leaking raw float precision", () => {
    // The exact reported bug: a kW->coefficient division can produce far more
    // than 6 natural decimal digits (here, 1.5 kW / 48.4 kW installed).
    expect(formatCoefficientForInput(1.5 / 48.4, "coefficient", undefined)).toBe("0,030992");
  });

  it("kw unit multiplies by installedPowerKw and formats fixed at 2 decimals, padding whole numbers too", () => {
    expect(formatCoefficientForInput(1 / 3, "kw", 60)).toBe("20,00");
    expect(formatCoefficientForInput(0.5, "kw", 60)).toBe("30,00");
  });

  it("undefined value formats as empty text in either unit", () => {
    expect(formatCoefficientForInput(undefined, "coefficient", 100)).toBe("");
    expect(formatCoefficientForInput(undefined, "kw", 100)).toBe("");
  });

  it("kw unit formats as empty text when installedPowerKw is missing or non-positive", () => {
    expect(formatCoefficientForInput(0.5, "kw", undefined)).toBe("");
    expect(formatCoefficientForInput(0.5, "kw", 0)).toBe("");
  });
});

describe("isValidCoefficientValue", () => {
  it("rejects undefined", () => {
    expect(isValidCoefficientValue(undefined)).toBe(false);
  });

  it("accepts a real zero and 1", () => {
    expect(isValidCoefficientValue(0)).toBe(true);
    expect(isValidCoefficientValue(1)).toBe(true);
  });

  it("rejects out-of-range or non-finite values", () => {
    expect(isValidCoefficientValue(1.5)).toBe(false);
    expect(isValidCoefficientValue(-0.1)).toBe(false);
    expect(isValidCoefficientValue(NaN)).toBe(false);
  });
});

describe("updateRowInput", () => {
  const rows: EditableCoefficientRow[] = [
    { supplyId: "s1", coefficient: {}, value: 0.3, inputText: "0,3" },
    { supplyId: "s2", coefficient: {}, value: 0.5, inputText: "0,5" },
  ];

  it("stores the typed text verbatim and derives value, leaving other rows untouched", () => {
    const next = updateRowInput(rows, "s1", "0,4", "coefficient", 100);
    expect(next[0]).toEqual({ supplyId: "s1", coefficient: {}, value: 0.4, inputText: "0,4" });
    expect(next[1]).toBe(rows[1]);
  });

  it("empty text -> value undefined, never 0 (percentage)", () => {
    const next = updateRowInput(rows, "s1", "", "coefficient", 100);
    expect(next[0].value).toBeUndefined();
    expect(next[0].inputText).toBe("");
  });

  it("'0' text -> value 0, a real zero that survives (percentage)", () => {
    const next = updateRowInput(rows, "s1", "0", "coefficient", 100);
    expect(next[0].value).toBe(0);
  });

  it("empty text -> value undefined, never 0 (kw)", () => {
    const next = updateRowInput(rows, "s1", "", "kw", 60);
    expect(next[0].value).toBeUndefined();
  });

  it("'0' text -> value 0, a real zero that survives (kw)", () => {
    const next = updateRowInput(rows, "s1", "0", "kw", 60);
    expect(next[0].value).toBe(0);
  });

  it("stores an incomplete/unparseable typed value verbatim, without discarding the keystroke", () => {
    // A lone comma is unparseable (mid-typing "0,5"), but the keystroke itself must
    // still show up in the field rather than being silently rejected.
    const next = updateRowInput(rows, "s1", ",", "coefficient", 100);
    expect(next[0].inputText).toBe(",");
    expect(next[0].value).toBeUndefined();
  });
});

describe("retextRowsForUnit — toggle invariance", () => {
  it("kW -> % -> kW -> % with no edits leaves every value unchanged and the sum exactly 1,000,000", () => {
    const installedPowerKw = 45;
    // Exact 6-decimal coefficients summing to exactly 1,000,000 units.
    const original: EditableCoefficientRow[] = [
      { supplyId: "s1", coefficient: {}, value: 0.333333, inputText: "0,333333" },
      { supplyId: "s2", coefficient: {}, value: 0.333333, inputText: "0,333333" },
      { supplyId: "s3", coefficient: {}, value: 0.333334, inputText: "0,333334" },
    ];
    const sumOf = (rows: EditableCoefficientRow[]) =>
      computeSharingAgreementCoefficientSums(rows.map((r) => ({ coefficient: r.value }))).fileSumUnits;
    expect(sumOf(original)).toBe(COEFFICIENT_SCALE);

    let rows = retextRowsForUnit(original, "kw", installedPowerKw);
    rows = retextRowsForUnit(rows, "coefficient", installedPowerKw);
    rows = retextRowsForUnit(rows, "kw", installedPowerKw);
    rows = retextRowsForUnit(rows, "coefficient", installedPowerKw);

    rows.forEach((row, i) => {
      expect(row.value).toBe(original[i].value);
    });
    expect(sumOf(rows)).toBe(COEFFICIENT_SCALE);
  });

  it("never re-parses inputText — a row's value is untouched even if its displayed kW text is rounded", () => {
    // 0.016670 * 60 = 1.0002 kW, which rounds to "1,00" at 2dp — retextRowsForUnit
    // must not re-derive value from that rounded text: it always re-derives text
    // from the still-precise value, never the reverse.
    const rows: EditableCoefficientRow[] = [{ supplyId: "s1", coefficient: {}, value: 0.01667, inputText: "0,01667" }];
    const toggled = retextRowsForUnit(retextRowsForUnit(rows, "kw", 60), "coefficient", 60);
    expect(toggled[0].value).toBe(0.01667);
  });

  it("formats a row with no value as empty text, in either direction", () => {
    const rows: EditableCoefficientRow[] = [{ supplyId: "s1", coefficient: {}, value: undefined, inputText: "" }];
    expect(retextRowsForUnit(rows, "kw", 60)[0].inputText).toBe("");
    expect(retextRowsForUnit(rows, "coefficient", 60)[0].inputText).toBe("");
  });
});
