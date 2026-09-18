import { describe, expect, it } from "vitest";
import {
  parsePercentageInput,
  buildEditableRowFromSupply,
  buildEditableRowsFromCoefficients,
  formatCoefficientForInput,
  isValidCoefficientValue,
  parseCoefficientInput,
  retextRowsForUnit,
  updateRowInput,
  type CoefficientInputUnit,
  type EditableCoefficientRow,
} from "./sharingAgreementCoefficientEditing";
import { computeSharingAgreementCoefficientSums, COEFFICIENT_SCALE, toIntegerUnits } from "./sharingAgreementCoefficientSums";
import {
  FIXTURE_COEFFICIENTS,
  FIXTURE_INSTALLED_POWER_KW,
  REPRODUCTION_ROW_SUPPLY_ID,
  REPRODUCTION_ROW_UNITS,
} from "./__fixtures__/coefficientSet63kw";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse, SupplyResponse } from "../../api/models";

// Fields every SharingAgreementPartitionCoefficientResponse fixture now needs but that
// these tests don't care about — a clean pending/never-applied default.
const PENDING_FIELDS = {
  validFrom: null,
  validTo: null,
  applicationState: SharingAgreementPartitionCoefficientResponseApplicationState.PENDING,
  endState: SharingAgreementPartitionCoefficientResponseEndState.OPEN,
  endDate: null,
  currentCoefficient: null,
} as const;

describe("buildEditableRowsFromCoefficients", () => {
  it("seeds value from the exact server coefficient and inputText fixed at 4 percentage decimals", () => {
    const rows = buildEditableRowsFromCoefficients(
      [{ coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "CUPS1" }, coefficient: 0.3, ...PENDING_FIELDS }],
      "percentage",
      100,
    );
    expect(rows).toEqual([
      { supplyId: "s1", coefficient: expect.objectContaining({ coefficientId: "c1" }), value: 0.3, inputText: "30,0000" },
    ]);
  });

  it("seeds an explicit zero coefficient as value 0 and inputText '0,0000', not empty", () => {
    const rows = buildEditableRowsFromCoefficients(
      [{ coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "CUPS1" }, coefficient: 0, ...PENDING_FIELDS }],
      "percentage",
      100,
    );
    expect(rows[0].value).toBe(0);
    expect(rows[0].inputText).toBe("0,0000");
  });

  it("seeds kW-unit text derived from value * installedPowerKw, fixed at 2 decimals", () => {
    const rows = buildEditableRowsFromCoefficients(
      [{ coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "CUPS1" }, coefficient: 0.5, ...PENDING_FIELDS }],
      "kw",
      60,
    );
    expect(rows[0].value).toBe(0.5);
    expect(rows[0].inputText).toBe("30,00");
  });

  it("drops entries with no supply id rather than crashing", () => {
    const rows = buildEditableRowsFromCoefficients(
      [
        {
          coefficientId: "c1",
          // Intentionally absent — this is the exact case under test.
          supply: undefined as unknown as SharingAgreementPartitionCoefficientResponse["supply"],
          coefficient: 0.5,
          ...PENDING_FIELDS,
        },
      ],
      "percentage",
      100,
    );
    expect(rows).toHaveLength(0);
  });

  it("re-rounds a drifted legacy coefficient to 6 decimals on load, so re-saving it untouched can't re-propagate the drift", () => {
    const rows = buildEditableRowsFromCoefficients(
      [{ coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "CUPS1" }, coefficient: 1 / 3, ...PENDING_FIELDS }],
      "percentage",
      100,
    );
    expect(rows[0].value).toBe(0.333333);
    expect(rows[0].inputText).toBe("33,3333");
  });

  it("leaves value undefined when the server coefficient is missing, never defaulting it to 0", () => {
    const rows = buildEditableRowsFromCoefficients(
      [
        {
          coefficientId: "c1",
          supply: { id: "s1", name: "Vivienda A", code: "CUPS1" },
          // Intentionally absent — this is the exact case under test.
          coefficient: undefined as unknown as number,
          ...PENDING_FIELDS,
        },
      ],
      "percentage",
      100,
    );
    expect(rows[0].value).toBeUndefined();
  });
});

describe("buildEditableRowFromSupply", () => {
  it("starts with an empty inputText and undefined value, never '0'/0", () => {
    // Only id/name/code are exercised by this function; the rest of SupplyResponse is irrelevant here.
    const row = buildEditableRowFromSupply({ id: "s2", name: "Local B", code: "CUPS2" } as SupplyResponse);
    expect(row.inputText).toBe("");
    expect(row.value).toBeUndefined();
    expect(row.supplyId).toBe("s2");
  });
});

describe("parseCoefficientInput", () => {
  it("percentage unit converts to the 0-1 coefficient the payload carries", () => {
    expect(parseCoefficientInput("50", "percentage", undefined)).toBe(0.5);
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

  it("refuses a percentage with more than four decimals rather than rounding it away in silence", () => {
    // Four percentage decimals are the six the distributor file carries. A fifth
    // digit is a figure the admin typed and the file cannot represent, so it is
    // rejected, not quietly rounded — the value reaches the distributor.
    expect(parseCoefficientInput("30,00005", "percentage", undefined)).toBeNaN();
  });
});

describe("parsePercentageInput", () => {
  // AC12, and the reason this parser exists at all: composing the units with
  // integer arithmetic makes the round trip exact by construction, rather than
  // handing the figure to IEEE-754 twice and rounding afterwards.
  it.each([
    ["30,0000", 300_000, 0.3],
    ["0,0001", 1, 0.000001],
    ["100,0000", 1_000_000, 1],
    ["33,3333", 333_333, 0.333333],
  ])("parses %s to exact millionths and back", (text, units, coefficient) => {
    const parsed = parsePercentageInput(text);
    expect(parsed).toEqual({ ok: true, units });
    expect(parseCoefficientInput(text, "percentage", undefined)).toBe(coefficient);
    expect(formatCoefficientForInput(coefficient, "percentage", undefined)).toBe(text);
  });

  it("pads a short fraction rather than reading it as a smaller number", () => {
    expect(parsePercentageInput("30,5")).toEqual({ ok: true, units: 305_000 });
    expect(parsePercentageInput("30,5000")).toEqual({ ok: true, units: 305_000 });
  });

  it("accepts a plain dot as the decimal separator, for keypads that emit one", () => {
    expect(parsePercentageInput("30.25")).toEqual({ ok: true, units: 302_500 });
  });

  it("strips grouping dots only when a comma marks the decimal place", () => {
    expect(parsePercentageInput("1.000,0000")).toEqual({ ok: true, units: 10_000_000 });
  });

  it("names why it failed, so the row can say which rule was broken", () => {
    expect(parsePercentageInput("")).toEqual({ ok: false, reason: "EMPTY" });
    expect(parsePercentageInput("  ")).toEqual({ ok: false, reason: "EMPTY" });
    expect(parsePercentageInput("abc")).toEqual({ ok: false, reason: "INVALID" });
    expect(parsePercentageInput(",")).toEqual({ ok: false, reason: "INVALID" });
    expect(parsePercentageInput("30,00005")).toEqual({ ok: false, reason: "TOO_MANY_DECIMALS" });
  });

  it("never produces a non-integer unit count, whatever it is handed", () => {
    for (const text of ["0,0001", "33,3333", "12,3456", "99,9999", "0,0000"]) {
      const parsed = parsePercentageInput(text);
      expect(parsed.ok && Number.isInteger(parsed.units)).toBe(true);
    }
  });
});

describe("formatCoefficientForInput", () => {
  it("percentage unit formats fixed at 4 decimals, padding a value with fewer natural digits", () => {
    expect(formatCoefficientForInput(0.123456, "percentage", undefined)).toBe("12,3456");
    expect(formatCoefficientForInput(0.5, "percentage", undefined)).toBe("50,0000");
  });

  it("percentage unit rounds a value with more natural digits than it can show, never leaking raw float precision", () => {
    // A kW->coefficient division can produce far more natural decimal digits
    // than either scale carries (here, 1.5 kW / 48.4 kW installed).
    expect(formatCoefficientForInput(1.5 / 48.4, "percentage", undefined)).toBe("3,0992");
  });

  it("kw unit multiplies by installedPowerKw and formats fixed at 2 decimals, padding whole numbers too", () => {
    expect(formatCoefficientForInput(1 / 3, "kw", 60)).toBe("20,00");
    expect(formatCoefficientForInput(0.5, "kw", 60)).toBe("30,00");
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
    { supplyId: "s1", coefficient: {} as SharingAgreementPartitionCoefficientResponse, value: 0.3, inputText: "0,3" },
    { supplyId: "s2", coefficient: {} as SharingAgreementPartitionCoefficientResponse, value: 0.5, inputText: "0,5" },
  ];

  it("stores the typed text verbatim and derives value, leaving other rows untouched", () => {
    const next = updateRowInput(rows, "s1", "40", "percentage", 100);
    expect(next[0]).toEqual({ supplyId: "s1", coefficient: {}, value: 0.4, inputText: "40" });
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
      { supplyId: "s1", coefficient: {} as SharingAgreementPartitionCoefficientResponse, value: 0.333333, inputText: "0,333333" },
      { supplyId: "s2", coefficient: {} as SharingAgreementPartitionCoefficientResponse, value: 0.333333, inputText: "0,333333" },
      { supplyId: "s3", coefficient: {} as SharingAgreementPartitionCoefficientResponse, value: 0.333334, inputText: "0,333334" },
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
    // 0.016670 * 60 = 1.0002 kW, which rounds to "1,00" at 2dp — retextRowsForUnit
    // must not re-derive value from that rounded text: it always re-derives text
    // from the still-precise value, never the reverse.
    const rows: EditableCoefficientRow[] = [{ supplyId: "s1", coefficient: {} as SharingAgreementPartitionCoefficientResponse, value: 0.01667, inputText: "0,01667" }];
    const toggled = retextRowsForUnit(retextRowsForUnit(rows, "kw", 60), "percentage", 60);
    expect(toggled[0].value).toBe(0.01667);
  });

  it("formats a row with no value as empty text, in either direction", () => {
    const rows: EditableCoefficientRow[] = [{ supplyId: "s1", coefficient: {} as SharingAgreementPartitionCoefficientResponse, value: undefined, inputText: "" }];
    expect(retextRowsForUnit(rows, "kw", 60)[0].inputText).toBe("");
    expect(retextRowsForUnit(rows, "percentage", 60)[0].inputText).toBe("");
  });
});

describe("the 63 kW / 29-supply fixture", () => {
  // Guards the fixture itself. Every test below reasons about a set that is
  // exactly 100%, so a fixture that silently stopped being one would turn
  // real regressions into passes.
  it("sums to exactly 1 000 000 millionths and carries the reproduction row", () => {
    expect(computeSharingAgreementCoefficientSums(FIXTURE_COEFFICIENTS).fileSumUnits).toBe(COEFFICIENT_SCALE);
    expect(FIXTURE_COEFFICIENTS).toHaveLength(29);

    const row = FIXTURE_COEFFICIENTS.find((c) => c.supply?.id === REPRODUCTION_ROW_SUPPLY_ID);
    expect(toIntegerUnits(row?.coefficient)).toBe(REPRODUCTION_ROW_UNITS);
  });

  // The premise of the whole bug: the kW string a row displays names an
  // interval of coefficients, not a coefficient.
  it("displays the reproduction row as 1,94 kW, which re-derives to a DIFFERENT coefficient", () => {
    const original = REPRODUCTION_ROW_UNITS / COEFFICIENT_SCALE;
    expect(formatCoefficientForInput(original, "kw", FIXTURE_INSTALLED_POWER_KW)).toBe("1,94");

    const reDerived = parseCoefficientInput("1,94", "kw", FIXTURE_INSTALLED_POWER_KW);
    expect(toIntegerUnits(reDerived)).toBe(30794);
    expect(toIntegerUnits(reDerived)).not.toBe(REPRODUCTION_ROW_UNITS);
  });

  // The asymmetry that decides what each mode's tests can prove: four percent
  // decimals are exactly one millionth, so "%" round-trips and kW does not.
  it("displays it as 3,0770 % , which re-derives to the SAME coefficient", () => {
    const original = REPRODUCTION_ROW_UNITS / COEFFICIENT_SCALE;
    expect(formatCoefficientForInput(original, "percentage", FIXTURE_INSTALLED_POWER_KW)).toBe("3,0770");

    const reDerived = parseCoefficientInput("3,0770", "percentage", FIXTURE_INSTALLED_POWER_KW);
    expect(toIntegerUnits(reDerived)).toBe(REPRODUCTION_ROW_UNITS);
  });
});

describe("updateRowInput — no-op guard", () => {
  const buildRows = (unit: CoefficientInputUnit) =>
    buildEditableRowsFromCoefficients(FIXTURE_COEFFICIENTS, unit, FIXTURE_INSTALLED_POWER_KW);

  const unitsOf = (rows: EditableCoefficientRow[], supplyId: string) =>
    toIntegerUnits(rows.find((row) => row.supplyId === supplyId)!.value);

  // AC7, kW. This is where the guard earns its keep: without it, restating the
  // displayed string rewrites 30770 as 30794 and the set leaves 100%.
  it("retyping the displayed kW string leaves the canonical coefficient byte-identical", () => {
    const rows = buildRows("kw");
    expect(rows.find((row) => row.supplyId === REPRODUCTION_ROW_SUPPLY_ID)!.inputText).toBe("1,94");

    const next = updateRowInput(rows, REPRODUCTION_ROW_SUPPLY_ID, "1,94", "kw", FIXTURE_INSTALLED_POWER_KW);

    expect(unitsOf(next, REPRODUCTION_ROW_SUPPLY_ID)).toBe(REPRODUCTION_ROW_UNITS);
    expect(computeSharingAgreementCoefficientSums(next.map((row) => ({ coefficient: row.value }))).fileSumUnits).toBe(
      COEFFICIENT_SCALE,
    );
  });

  // AC7, percentage. Here the guard is NOT load-bearing — "%" is lossless, so
  // re-deriving would land on 30770 anyway. The test is a regression guard on
  // that losslessness: it fails the moment the "%" path gains a rounding step,
  // a float, or a different decimal count.
  it("retyping the displayed percentage string leaves the canonical coefficient byte-identical", () => {
    const rows = buildRows("percentage");
    expect(rows.find((row) => row.supplyId === REPRODUCTION_ROW_SUPPLY_ID)!.inputText).toBe("3,0770");

    const next = updateRowInput(rows, REPRODUCTION_ROW_SUPPLY_ID, "3,0770", "percentage", FIXTURE_INSTALLED_POWER_KW);

    expect(unitsOf(next, REPRODUCTION_ROW_SUPPLY_ID)).toBe(REPRODUCTION_ROW_UNITS);
  });

  // Same coefficient, differently spelled. The comparison is between rendered
  // strings, so normalization comes free and a raw text equality check would
  // not do.
  it("accepts a differently-spelled restatement of the same value as a no-op", () => {
    const rows = buildRows("kw");

    for (const spelling of ["1.94", "01,94", " 1,94 "]) {
      const next = updateRowInput(rows, REPRODUCTION_ROW_SUPPLY_ID, spelling, "kw", FIXTURE_INSTALLED_POWER_KW);
      expect(unitsOf(next, REPRODUCTION_ROW_SUPPLY_ID)).toBe(REPRODUCTION_ROW_UNITS);
      expect(next.find((row) => row.supplyId === REPRODUCTION_ROW_SUPPLY_ID)!.inputText).toBe(spelling);
    }
  });

  it("stores the typed text verbatim even when the value is left untouched", () => {
    const rows = buildRows("percentage");

    const next = updateRowInput(rows, REPRODUCTION_ROW_SUPPLY_ID, "3,077", "percentage", FIXTURE_INSTALLED_POWER_KW);

    expect(next.find((row) => row.supplyId === REPRODUCTION_ROW_SUPPLY_ID)!.inputText).toBe("3,077");
    expect(unitsOf(next, REPRODUCTION_ROW_SUPPLY_ID)).toBe(REPRODUCTION_ROW_UNITS);
  });

  // The guard must never swallow a real edit — it only declines to move a
  // value the text already names.
  it("a genuinely different value still lands", () => {
    const rows = buildRows("kw");

    const next = updateRowInput(rows, REPRODUCTION_ROW_SUPPLY_ID, "1,90", "kw", FIXTURE_INSTALLED_POWER_KW);

    expect(unitsOf(next, REPRODUCTION_ROW_SUPPLY_ID)).toBe(30159);
  });

  // The degenerate "" === "" case. A row with no value yet must accept its
  // first keystroke, not be frozen by a guard comparing two empty renderings.
  it("never fires on a row whose canonical value is undefined", () => {
    const empty = buildEditableRowFromSupply({ id: "supply-new", name: "Nuevo", code: "ES999" } as SupplyResponse);
    expect(empty.value).toBeUndefined();

    const next = updateRowInput([empty], "supply-new", "1,94", "kw", FIXTURE_INSTALLED_POWER_KW);

    expect(toIntegerUnits(next[0].value)).toBe(30794);
  });

  // Same degenerate case from the other side: no installed power means kW
  // renders as "" for every value, which must not make every edit a no-op.
  it("never fires in kW mode when installedPowerKw is missing", () => {
    const rows = buildRows("kw");

    const next = updateRowInput(rows, REPRODUCTION_ROW_SUPPLY_ID, "1,94", "kw", undefined);

    expect(next.find((row) => row.supplyId === REPRODUCTION_ROW_SUPPLY_ID)!.value).toBeUndefined();
  });

  it("clearing the field still empties the value, blocking save", () => {
    const rows = buildRows("kw");

    const next = updateRowInput(rows, REPRODUCTION_ROW_SUPPLY_ID, "", "kw", FIXTURE_INSTALLED_POWER_KW);

    expect(next.find((row) => row.supplyId === REPRODUCTION_ROW_SUPPLY_ID)!.value).toBeUndefined();
  });

  it("leaves every other row untouched", () => {
    const rows = buildRows("kw");

    const next = updateRowInput(rows, REPRODUCTION_ROW_SUPPLY_ID, "1,94", "kw", FIXTURE_INSTALLED_POWER_KW);

    expect(next.filter((row) => row.supplyId !== REPRODUCTION_ROW_SUPPLY_ID)).toEqual(
      rows.filter((row) => row.supplyId !== REPRODUCTION_ROW_SUPPLY_ID),
    );
  });
});
