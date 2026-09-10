import { describe, expect, it } from "vitest";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
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
} from "./sharingAgreementCoefficientState";

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
  it("tells the admin to register it when the distributor applies it, for PENDING", () => {
    expect(getApplicationStateDetail(asCoefficient({ applicationState: PENDING }))).toBe(
      "Regístrala cuando la distribuidora lo aplique",
    );
  });

  it("has no caption for APPLIED — the date lives in the headline instead", () => {
    expect(getApplicationStateDetail(asCoefficient({ applicationState: APPLIED, validFrom: "2024-05-23T00:00:00Z" }))).toBeUndefined();
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
    [PENDING, OPEN, []],
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
