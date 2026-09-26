import { describe, expect, it } from "vitest";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import { SharingAgreementReferenceResponseStatus } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import {
  getApplicationStateColor,
  getApplicationStateDetail,
  getApplicationStateHeadline,
  getApplicationStateLabel,
  getAvailableCoefficientActions,
  getCoefficientCupsLabel,
  getEndStateLabel,
  isEndStateReadOnly,
  isFullyAvailable,
  summarizeSelectionActions,
} from "./sharingAgreementCoefficientState";
import { buildCoefficient } from "../../test/fixtures";

// These tests exercise a single field at a time against otherwise-irrelevant
// partial fixtures, so each literal is cast rather than fully fabricated.
const asCoefficient = (partial: Partial<SharingAgreementPartitionCoefficientResponse>) =>
  partial as SharingAgreementPartitionCoefficientResponse;

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, OPEN_ORPHAN, PENDING_SUCCESSION, DERIVED, CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;

describe("getApplicationStateLabel", () => {
  it("labels PENDING", () => {
    expect(getApplicationStateLabel(PENDING)).toBe("Sin aplicar");
  });

  it("labels APPLIED", () => {
    expect(getApplicationStateLabel(APPLIED)).toBe("En vigor");
  });

  it("falls back for undefined", () => {
    expect(getApplicationStateLabel(undefined)).toBe("-");
  });
});

describe("getApplicationStateHeadline", () => {
  it("headlines PENDING", () => {
    expect(getApplicationStateHeadline(asCoefficient({ applicationState: PENDING }))).toBe("Sin fecha de aplicación");
  });

  it("headlines APPLIED with the validFrom date", () => {
    expect(getApplicationStateHeadline(asCoefficient({ applicationState: APPLIED, validFrom: "2024-05-23T00:00:00Z" }))).toBe(
      "En vigor desde 23 de mayo de 2024",
    );
  });

  it("headlines APPLIED without a validFrom as just 'En vigor', never a nonsense date", () => {
    expect(getApplicationStateHeadline(asCoefficient({ applicationState: APPLIED }))).toBe("En vigor");
  });

  it("falls back for an unexpected state", () => {
    expect(getApplicationStateHeadline(asCoefficient({}))).toBe("-");
  });
});

describe("getApplicationStateColor", () => {
  it("colors PENDING as warning", () => {
    expect(getApplicationStateColor(PENDING)).toBe("warning");
  });

  it("colors APPLIED as success", () => {
    expect(getApplicationStateColor(APPLIED)).toBe("success");
  });

  it("falls back to default for undefined", () => {
    expect(getApplicationStateColor(undefined)).toBe("default");
  });
});

describe("getApplicationStateDetail", () => {
  const inForce = (coefficient: number, name: string) => ({
    coefficient,
    validFrom: "2023-01-01T00:00:00Z",
    sharingAgreement: { id: `sa-${name}`, name, status: SharingAgreementReferenceResponseStatus.SUPERSEDED },
  });

  // A realistic mixed set on a sealed agreement, read row by row: the caption
  // depends on each row's own state and coefficient in force, never on its
  // neighbours.
  const rows = [
    buildCoefficient({ coefficientId: "pending-in-force", applicationState: PENDING, currentCoefficient: inForce(0.03125, "Reparto 2023") }),
    buildCoefficient({ coefficientId: "pending-new", applicationState: PENDING, currentCoefficient: null }),
    buildCoefficient({ coefficientId: "pending-newer", applicationState: PENDING, currentCoefficient: inForce(0.4, "Reparto 2026") }),
    buildCoefficient({ coefficientId: "applied-open", applicationState: APPLIED, endState: OPEN, validFrom: "2024-05-23T00:00:00Z", currentCoefficient: inForce(0.2, "Reparto 2024") }),
    buildCoefficient({ coefficientId: "applied-closed", applicationState: APPLIED, endState: CLOSED, validFrom: "2024-05-23T00:00:00Z", currentCoefficient: null }),
    buildCoefficient({ coefficientId: "applied-derived", applicationState: APPLIED, endState: DERIVED, validFrom: "2024-05-23T00:00:00Z", currentCoefficient: null }),
  ];

  it("names the coefficient in force and its agreement for each pending row that has one, and warns for the one that has none", () => {
    // formatCoefficientPercentage separates the unit with U+00A0; it renders as
    // "En vigor: 3,1250 % (Reparto 2023)", with the unit exactly once.
    expect(rows.map((row) => getApplicationStateDetail(row))).toEqual([
      "En vigor: 3,1250 % (Reparto 2023)",
      "No recibe producción hasta que registres la fecha",
      "En vigor: 40,0000 % (Reparto 2026)",
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("never doubles the percent sign", () => {
    const detail = getApplicationStateDetail(rows[0]) ?? "";
    expect(detail.match(/%/g)).toHaveLength(1);
  });

  it("keeps the original prompt on every pending row of a DRAFT, whatever is in force", () => {
    expect(rows.slice(0, 3).map((row) => getApplicationStateDetail(row, true))).toEqual([
      "Regístrala cuando la distribuidora lo aplique",
      "Regístrala cuando la distribuidora lo aplique",
      "Regístrala cuando la distribuidora lo aplique",
    ]);
  });
});

describe("getEndStateLabel — all 5 endState values", () => {
  it("OPEN renders as an em dash", () => {
    expect(getEndStateLabel(asCoefficient({ endState: OPEN }))).toBe("—");
  });

  it("OPEN_ORPHAN renders as 'Sin cerrar'", () => {
    expect(getEndStateLabel(asCoefficient({ endState: OPEN_ORPHAN }))).toBe("Sin cerrar");
  });

  it("PENDING_SUCCESSION renders as 'Pendiente del siguiente acuerdo'", () => {
    expect(getEndStateLabel(asCoefficient({ endState: PENDING_SUCCESSION }))).toBe("Pendiente del siguiente acuerdo");
  });

  it("DERIVED renders the endDate", () => {
    expect(getEndStateLabel(asCoefficient({ endState: DERIVED, endDate: "2025-01-01T00:00:00Z" }))).toBe("1 de enero de 2025");
  });

  it("CLOSED renders the endDate", () => {
    expect(getEndStateLabel(asCoefficient({ endState: CLOSED, endDate: "2025-06-15T00:00:00Z" }))).toBe("15 de junio de 2025");
  });

  it("falls back to an em dash for undefined", () => {
    expect(getEndStateLabel(asCoefficient({}))).toBe("—");
  });
});

describe("isEndStateReadOnly — truth table", () => {
  it.each([
    [OPEN, false],
    [OPEN_ORPHAN, false],
    [PENDING_SUCCESSION, true],
    [DERIVED, true],
    [CLOSED, false],
    [undefined, false],
  ])("%s -> %s", (endState, expected) => {
    expect(isEndStateReadOnly(endState)).toBe(expected);
  });
});

describe("getAvailableCoefficientActions — every producible applicationState × endState combination", () => {
  it.each([
    // PENDING is only ever OPEN per the backend's own invariants — CLOSED/DERIVED are impossible and not tested.
    [PENDING, OPEN, ["apply"]],
    [APPLIED, OPEN, ["correct", "deactivate"]],
    [APPLIED, OPEN_ORPHAN, ["correct", "deactivate", "close"]],
    [APPLIED, PENDING_SUCCESSION, ["correct", "deactivate"]],
    [APPLIED, DERIVED, ["correct", "deactivate"]],
    [APPLIED, CLOSED, ["correct", "deactivate", "reopen"]],
  ] as const)("%s × %s -> %s", (applicationState, endState, expected) => {
    expect(getAvailableCoefficientActions(applicationState, endState)).toEqual(expected);
  });

  it("returns no actions when applicationState is undefined, regardless of endState", () => {
    expect(getAvailableCoefficientActions(undefined, OPEN_ORPHAN)).toEqual([]);
  });
});

describe("summarizeSelectionActions / isFullyAvailable", () => {
  const pending = asCoefficient({ applicationState: PENDING, endState: OPEN });
  const appliedOpen = asCoefficient({ applicationState: APPLIED, endState: OPEN });
  const appliedOrphan = asCoefficient({ applicationState: APPLIED, endState: OPEN_ORPHAN });
  const appliedClosed = asCoefficient({ applicationState: APPLIED, endState: CLOSED });

  it("an empty selection offers no action", () => {
    expect(summarizeSelectionActions([])).toEqual([]);
  });

  it("an action is fully available only when every selected row supports it", () => {
    const result = summarizeSelectionActions([appliedOpen, appliedOpen]);
    const correct = result.find((item) => item.action === "correct")!;
    expect(correct).toEqual({ action: "correct", eligibleCount: 2, selectedCount: 2 });
    expect(isFullyAvailable(correct)).toBe(true);
  });

  it("an action supported by some selected rows is reported with its eligible count and is not fully available", () => {
    const result = summarizeSelectionActions([appliedOpen, pending]);
    const correct = result.find((item) => item.action === "correct")!;
    expect(correct).toEqual({ action: "correct", eligibleCount: 1, selectedCount: 2 });
    expect(isFullyAvailable(correct)).toBe(false);
  });

  it("an action supported by no selected row is not reported", () => {
    // Neither row is ever eligible for close/reopen/apply — appliedOpen only
    // ever supports correct/deactivate.
    const result = summarizeSelectionActions([appliedOpen, appliedOpen]);
    expect(result.map((item) => item.action).sort()).toEqual(["correct", "deactivate"]);
  });

  it("a pending row never contributes close or reopen, even outnumbering the applied row in the selection", () => {
    const result = summarizeSelectionActions([pending, pending, pending, appliedOrphan]);
    const close = result.find((item) => item.action === "close")!;
    expect(close).toEqual({ action: "close", eligibleCount: 1, selectedCount: 4 });
    expect(isFullyAvailable(close)).toBe(false);
    expect(result.some((item) => item.action === "reopen")).toBe(false);
  });

  it("a selection mixing pending and applied rows has no fully available action", () => {
    const result = summarizeSelectionActions([pending, appliedOpen, appliedClosed]);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => !isFullyAvailable(item))).toBe(true);
  });

  it("orders results the same way the row menu does: correct, deactivate, then close/reopen", () => {
    const result = summarizeSelectionActions([appliedOrphan, appliedClosed]);
    expect(result.map((item) => item.action)).toEqual(["correct", "deactivate", "close", "reopen"]);
  });
});

describe("getCoefficientCupsLabel", () => {
  it("names the supply and its CUPS when a name exists", () => {
    expect(getCoefficientCupsLabel(asCoefficient({ supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" } }))).toBe(
      "Vivienda A (CUPS ES0031300000000001AB)",
    );
  });

  it("falls back to CUPS only, never the supply UUID, when the supply has no name", () => {
    expect(getCoefficientCupsLabel(asCoefficient({ supply: { id: "d8e14158-41fa-405b-ab48-4abd9a126079", name: "", code: "ES0031300000000001AB" } }))).toBe(
      "CUPS ES0031300000000001AB",
    );
  });

  it("returns an empty string when there's no coefficient or no supply at all", () => {
    expect(getCoefficientCupsLabel(undefined)).toBe("");
    expect(getCoefficientCupsLabel(asCoefficient({}))).toBe("");
  });
});
