import { describe, expect, it } from "vitest";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import {
  getApplicationStateDetail,
  getApplicationStateLabel,
  getEndStateLabel,
  isEndStateReadOnly,
} from "./sharingAgreementCoefficientState";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, OPEN_ORPHAN, PENDING_SUCCESSION, DERIVED, CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;

describe("getApplicationStateLabel", () => {
  it("labels PENDING", () => {
    expect(getApplicationStateLabel(PENDING)).toBe("Pendiente de tratamiento");
  });

  it("labels APPLIED", () => {
    expect(getApplicationStateLabel(APPLIED)).toBe("Aplicado");
  });

  it("falls back for undefined", () => {
    expect(getApplicationStateLabel(undefined)).toBe("-");
  });
});

describe("getApplicationStateDetail", () => {
  it("explains PENDING contributes 0 to the applied sum", () => {
    expect(getApplicationStateDetail({ applicationState: PENDING })).toBe("Contribuye 0 a la suma aplicada");
  });

  it("shows the validFrom date for APPLIED", () => {
    expect(getApplicationStateDetail({ applicationState: APPLIED, validFrom: "2024-05-23T00:00:00Z" })).toBe(
      "Desde 23 de mayo de 2024",
    );
  });
});

describe("getEndStateLabel — all 5 endState values", () => {
  it("OPEN renders as an em dash", () => {
    expect(getEndStateLabel({ endState: OPEN })).toBe("—");
  });

  it("OPEN_ORPHAN renders as 'Sin cerrar'", () => {
    expect(getEndStateLabel({ endState: OPEN_ORPHAN })).toBe("Sin cerrar");
  });

  it("PENDING_SUCCESSION renders as 'Pendiente del siguiente acuerdo'", () => {
    expect(getEndStateLabel({ endState: PENDING_SUCCESSION })).toBe("Pendiente del siguiente acuerdo");
  });

  it("DERIVED renders the endDate", () => {
    expect(getEndStateLabel({ endState: DERIVED, endDate: "2025-01-01T00:00:00Z" })).toBe("1 de enero de 2025");
  });

  it("CLOSED renders the endDate", () => {
    expect(getEndStateLabel({ endState: CLOSED, endDate: "2025-06-15T00:00:00Z" })).toBe("15 de junio de 2025");
  });

  it("falls back to an em dash for undefined", () => {
    expect(getEndStateLabel({})).toBe("—");
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
