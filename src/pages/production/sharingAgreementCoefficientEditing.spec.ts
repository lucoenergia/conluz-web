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
  it("seeds value from the exact server coefficient and inputText formatted with a Spanish comma", () => {
    const rows = buildEditableRowsFromCoefficients(
      [{ coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "CUPS1" }, coefficient: 0.3 }],
      "percentage",
      100,
    );
    expect(rows).toEqual([
      { supplyId: "s1", coefficient: expect.objectContaining({ coefficientId: "c1" }), value: 0.3, inputText: "0,3" },
    ]);
  });

  it("seeds an explicit zero coefficient as value 0 and inputText '0', not empty", () => {
    const rows = buildEditableRowsFromCoefficients([{ supply: { id: "s1" }, coefficient: 0 }], "percentage", 100);
    expect(rows[0].value).toBe(0);
    expect(rows[0].inputText).toBe("0");
  });

  it("seeds kW-unit text derived from value * installedPowerKw", () => {
    const rows = buildEditableRowsFromCoefficients([{ supply: { id: "s1" }, coefficient: 0.5 }], "kw", 60);
    expect(rows[0].value).toBe(0.5);
    expect(rows[0].inputText).toBe("30");
  });

  it("drops entries with no supply id rather than crashing", () => {
    const rows = buildEditableRowsFromCoefficients([{ supply: undefined, coefficient: 0.5 }], "percentage", 100);
    expect(rows).toHaveLength(0);
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
    expect(parseCoefficientInput("0,5", "percentage", undefined)).toBe(0.5);
  });

  it("kw unit divides by installedPowerKw", () => {
    expect(parseCoefficientInput("30", "kw", 60)).toBe(0.5);
  });

  it("kw unit returns NaN when installedPowerKw is missing or non-positive", () => {
    expect(parseCoefficientInput("30", "kw", undefined)).toBeNaN();
    expect(parseCoefficientInput("30", "kw", 0)).toBeNaN();
  });

  it("empty text is NaN in both units, never 0", () => {
    expect(parseCoefficientInput("", "percentage", 100)).toBeNaN();
    expect(parseCoefficientInput("", "kw", 100)).toBeNaN();
  });

  it("'0' parses to a real 0 in both units, never NaN", () => {
    expect(parseCoefficientInput("0", "percentage", 100)).toBe(0);
    expect(parseCoefficientInput("0", "kw", 100)).toBe(0);
  });
});

describe("formatCoefficientForInput", () => {
  it("percentage unit formats with a Spanish comma, full precision", () => {
    expect(formatCoefficientForInput(0.123456, "percentage", undefined)).toBe("0,123456");
  });

  it("kw unit multiplies by installedPowerKw and rounds to 4dp", () => {
    expect(formatCoefficientForInput(1 / 3, "kw", 60)).toBe("20");
  });

  it("undefined value formats as empty text in either unit", () => {
    expect(formatCoefficientForInput(undefined, "percentage", 100)).toBe("");
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
    const next = updateRowInput(rows, "s1", "0,4", "percentage", 100);
    expect(next[0]).toEqual({ supplyId: "s1", coefficient: {}, value: 0.4, inputText: "0,4" });
    expect(next[1]).toBe(rows[1]);
  });

  it("empty text -> value undefined, never 0 (percentage)", () => {
    const next = updateRowInput(rows, "s1", "", "percentage", 100);
    expect(next[0].value).toBeUndefined();
    expect(next[0].inputText).toBe("");
  });

  it("'0' text -> value 0, a real zero that survives (percentage)", () => {
    const next = updateRowInput(rows, "s1", "0", "percentage", 100);
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
    const next = updateRowInput(rows, "s1", ",", "percentage", 100);
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
    rows = retextRowsForUnit(rows, "percentage", installedPowerKw);
    rows = retextRowsForUnit(rows, "kw", installedPowerKw);
    rows = retextRowsForUnit(rows, "percentage", installedPowerKw);

    rows.forEach((row, i) => {
      expect(row.value).toBe(original[i].value);
    });
    expect(sumOf(rows)).toBe(COEFFICIENT_SCALE);
  });

  it("never re-parses inputText — a row's value is untouched even if its displayed kW text is rounded", () => {
    // 0.016670 * 60 = 1.0002 kW, which rounds to "1,0002" at 4dp — but even if it
    // rounded further (e.g. to "1,00"), retextRowsForUnit must not re-derive value
    // from that rounded text: it always re-derives text from the still-precise value.
    const rows: EditableCoefficientRow[] = [{ supplyId: "s1", coefficient: {}, value: 0.01667, inputText: "0,01667" }];
    const toggled = retextRowsForUnit(retextRowsForUnit(rows, "kw", 60), "percentage", 60);
    expect(toggled[0].value).toBe(0.01667);
  });

  it("formats a row with no value as empty text, in either direction", () => {
    const rows: EditableCoefficientRow[] = [{ supplyId: "s1", coefficient: {}, value: undefined, inputText: "" }];
    expect(retextRowsForUnit(rows, "kw", 60)[0].inputText).toBe("");
    expect(retextRowsForUnit(rows, "percentage", 60)[0].inputText).toBe("");
  });
});
