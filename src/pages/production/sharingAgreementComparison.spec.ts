import { describe, expect, it } from "vitest";
import { SharingAgreementReferenceResponseStatus, type SharingAgreementReferenceResponse } from "../../api/models";
import { buildActiveCoefficient, buildCoefficient } from "../../test/fixtures";
import {
  buildRowComparisonView,
  computeInForcePowerKw,
  findOutgoingCoefficients,
  formatInForceCoefficientLine,
  formatInForcePowerLine,
  formatPercentagePointDelta,
  resolveComparisonContext,
  resolveRowInForce,
  type InForceAgreementPower,
} from "./sharingAgreementComparison";

const AGREEMENT_A: SharingAgreementReferenceResponse = {
  id: "agreement-a",
  name: "Reparto 2024",
  status: SharingAgreementReferenceResponseStatus.PUBLISHED,
};
const AGREEMENT_B: SharingAgreementReferenceResponse = {
  id: "agreement-b",
  name: "Reparto ampliación",
  status: SharingAgreementReferenceResponseStatus.PUBLISHED,
};

function supply(id: string, code: string) {
  return { id, code, name: null };
}

function active(supplyId: string, code: string, coefficient: number, agreement = AGREEMENT_A) {
  return buildActiveCoefficient({
    id: `active-${supplyId}`,
    supply: supply(supplyId, code),
    coefficient,
    sharingAgreement: agreement,
  });
}

function savedRow(supplyId: string, coefficient: number, current: { coefficient: number; agreement: SharingAgreementReferenceResponse } | null) {
  return buildCoefficient({
    coefficientId: `coefficient-${supplyId}`,
    supply: supply(supplyId, `ES-${supplyId}`),
    coefficient,
    currentCoefficient: current
      ? { coefficient: current.coefficient, validFrom: "2024-01-01", sharingAgreement: current.agreement }
      : null,
  });
}

/** A row added during the editing session: no coefficientId, no server answer yet. */
function unsavedRow(supplyId: string) {
  return buildCoefficient({ coefficientId: "", supply: supply(supplyId, `ES-${supplyId}`), currentCoefficient: null });
}

describe("findOutgoingCoefficients", () => {
  const ACTIVE = [
    active("s1", "ES-A", 0.3),
    active("s2", "ES-B", 0.2, AGREEMENT_B),
    active("s3", "ES-C", 0.25),
    active("s4", "ES-D", 0.25, AGREEMENT_B),
  ];

  it("keeps only the active supplies with no row in the draft, in the endpoint's order", () => {
    const outgoing = findOutgoingCoefficients(ACTIVE, new Set(["s1", "s3", "s9"]));
    expect(outgoing.map((c) => c.supply.code)).toEqual(["ES-B", "ES-D"]);
  });

  it("ignores draft supplies that are not active anywhere in the plant", () => {
    expect(findOutgoingCoefficients(ACTIVE, new Set(["s1", "s2", "s3", "s4", "s7", "s8"]))).toEqual([]);
  });

  it("returns every active supply when the draft has none of them", () => {
    const outgoing = findOutgoingCoefficients(ACTIVE, new Set(["s7", "s8"]));
    expect(outgoing.map((c) => c.supply.id)).toEqual(["s1", "s2", "s3", "s4"]);
  });

  it("handles empty collections on either side", () => {
    expect(findOutgoingCoefficients([], new Set(["s1", "s2"]))).toEqual([]);
    expect(findOutgoingCoefficients(ACTIVE, new Set()).map((c) => c.supply.id)).toEqual(["s1", "s2", "s3", "s4"]);
  });
});

describe("resolveComparisonContext", () => {
  it("names the agreement when every in-force coefficient comes from it", () => {
    const context = resolveComparisonContext([AGREEMENT_A, null, AGREEMENT_A, undefined], [active("s9", "ES-Z", 0.1)]);
    expect(context).toEqual({ kind: "single", agreement: AGREEMENT_A });
  });

  it("reports several agreements when the second one appears only among the outgoing supplies", () => {
    const context = resolveComparisonContext(
      [AGREEMENT_A, AGREEMENT_A, null],
      [active("s8", "ES-Y", 0.1), active("s9", "ES-Z", 0.1, AGREEMENT_B)],
    );
    expect(context).toEqual({ kind: "multiple" });
  });

  it("reports several agreements when the rows alone reference two", () => {
    expect(resolveComparisonContext([AGREEMENT_A, AGREEMENT_B, null], [])).toEqual({ kind: "multiple" });
  });

  it("has nothing to compare against when no row is in force and nothing leaves", () => {
    expect(resolveComparisonContext([null, null, undefined], [])).toEqual({ kind: "none" });
  });
});

describe("formatPercentagePointDelta", () => {
  it("signs a positive and a negative difference, in es-ES with 4 decimals", () => {
    expect(formatPercentagePointDelta(0.05)).toBe("+5,0000 p.p.");
    expect(formatPercentagePointDelta(-0.009921)).toBe("-0,9921 p.p.");
    expect(formatPercentagePointDelta(0.000001)).toBe("+0,0001 p.p.");
  });

  it("omits a zero difference", () => {
    expect(formatPercentagePointDelta(0)).toBeNull();
  });

  it("omits a non-zero difference that rounds to zero at 4 decimals", () => {
    expect(formatPercentagePointDelta(0.0000001)).toBeNull();
    expect(formatPercentagePointDelta(-0.0000001)).toBeNull();
  });
});

describe("formatInForceCoefficientLine", () => {
  it("shows the in-force value and the draft-minus-in-force delta in points (AC1)", () => {
    expect(formatInForceCoefficientLine(0.041667, 0.031746)).toBe("Vigente 4,1667 % · -0,9921 p.p.");
    expect(formatInForceCoefficientLine(0.2, 0.25)).toBe("Vigente 20,0000 % · +5,0000 p.p.");
  });

  it("drops the delta when nothing changes", () => {
    expect(formatInForceCoefficientLine(0.041667, 0.041667)).toBe("Vigente 4,1667 %");
  });

  it("never renders a signed zero for a difference below the displayed precision", () => {
    for (const draft of [0.0416671, 0.0416669]) {
      const line = formatInForceCoefficientLine(0.041667, draft);
      expect(line).toBe("Vigente 4,1667 %");
      expect(line).not.toMatch(/[+-]0,0000 p\.p\./);
    }
  });

  it("keeps the in-force value without a delta while the draft field is empty or invalid", () => {
    expect(formatInForceCoefficientLine(0.041667, undefined)).toBe("Vigente 4,1667 %");
    expect(formatInForceCoefficientLine(0.041667, Number.NaN)).toBe("Vigente 4,1667 %");
    expect(formatInForceCoefficientLine(0.041667, 1.5)).toBe("Vigente 4,1667 %");
  });
});

describe("in-force assigned power", () => {
  it("uses the installed power of the agreement that authored the coefficient, not the draft's", () => {
    const draftInstalledPowerKw = 100;
    const rows = [savedRow("s1", 0.5, { coefficient: 0.5, agreement: AGREEMENT_A }), savedRow("s2", 0.5, { coefficient: 0.25, agreement: AGREEMENT_B })];
    const power = new Map<string, InForceAgreementPower>([
      [AGREEMENT_A.id, { status: "success", installedPowerKw: 80 }],
      [AGREEMENT_B.id, { status: "success", installedPowerKw: 60 }],
    ]);

    const lines = rows.map((row) => {
      const view = buildRowComparisonView(resolveRowInForce(row, undefined), power);
      return view.kind === "inForce" ? formatInForcePowerLine(view.coefficient, view.power) : null;
    });

    expect(lines).toEqual(["Vigente 40,00 kW", "Vigente 15,00 kW"]);
    expect(lines).not.toContain(`Vigente ${0.5 * draftInstalledPowerKw},00 kW`);
  });

  it("computes nothing without an installed power", () => {
    expect(computeInForcePowerKw(0.3, 50)).toBe(15);
    expect(computeInForcePowerKw(0.3, undefined)).toBeNull();
  });

  it("shows a dash when the authoring agreement failed to load, and nothing while it loads", () => {
    expect(formatInForcePowerLine(0.3, { status: "error" })).toBe("Vigente —");
    expect(formatInForcePowerLine(0.3, { status: "success", installedPowerKw: undefined })).toBe("Vigente —");
    expect(formatInForcePowerLine(0.3, { status: "loading" })).toBeNull();
  });
});

describe("resolveRowInForce", () => {
  const activeBySupplyId = new Map([
    ["s1", active("s1", "ES-A", 0.3)],
    ["s2", active("s2", "ES-B", 0.2, AGREEMENT_B)],
  ]);

  it("reads a saved row's own currentCoefficient, not the active map", () => {
    const rows = [savedRow("s1", 0.4, { coefficient: 0.35, agreement: AGREEMENT_B }), savedRow("s5", 0.6, null)];
    expect(rows.map((row) => resolveRowInForce(row, activeBySupplyId))).toEqual([
      { kind: "present", inForce: { coefficient: 0.35, sharingAgreement: AGREEMENT_B } },
      { kind: "none" },
    ]);
  });

  it("looks an unsaved row up in the plant's active coefficients", () => {
    const rows = [unsavedRow("s2"), unsavedRow("s6")];
    expect(rows.map((row) => resolveRowInForce(row, activeBySupplyId))).toEqual([
      { kind: "present", inForce: { coefficient: 0.2, sharingAgreement: AGREEMENT_B } },
      { kind: "none" },
    ]);
  });

  it("leaves an unsaved row unknown while the active coefficients are unavailable", () => {
    const rows = [unsavedRow("s2"), unsavedRow("s6"), savedRow("s1", 0.4, null)];
    expect(rows.map((row) => resolveRowInForce(row, undefined))).toEqual([{ kind: "unknown" }, { kind: "unknown" }, { kind: "none" }]);
  });
});

describe("buildRowComparisonView", () => {
  it("maps each row to new, in force with its agreement's power, or unknown", () => {
    const power = new Map<string, InForceAgreementPower>([[AGREEMENT_A.id, { status: "success", installedPowerKw: 80 }]]);
    const views = [
      { kind: "none" as const },
      { kind: "present" as const, inForce: { coefficient: 0.3, sharingAgreement: AGREEMENT_A } },
      { kind: "present" as const, inForce: { coefficient: 0.2, sharingAgreement: AGREEMENT_B } },
      { kind: "unknown" as const },
    ].map((inForce) => buildRowComparisonView(inForce, power));

    expect(views).toEqual([
      { kind: "new" },
      { kind: "inForce", coefficient: 0.3, power: { status: "success", installedPowerKw: 80 } },
      { kind: "inForce", coefficient: 0.2, power: { status: "loading" } },
      { kind: "unknown" },
    ]);
  });
});
