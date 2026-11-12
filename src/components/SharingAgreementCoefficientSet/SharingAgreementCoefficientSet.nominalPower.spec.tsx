import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { OPEN_UNCLOSED, renderWithTheme } from "./SharingAgreementCoefficientSet.testUtils";

const { PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;

vi.mock(import("../../context/success.context"), (orig) => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.successContextModule(orig)));
vi.mock(import("../../api/supplies/supplies"), () => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.suppliesModule()));
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), (orig) => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.sharingAgreementsModule(orig)));

// Two supplies summing to 100 % of an agreement whose nominal power is 60 kW.
const ROWS: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "1", supply: { id: "s1", name: "A", code: "X1" }, coefficient: 0.25, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "2", supply: { id: "s2", name: "B", code: "X2" }, coefficient: 0.75, applicationState: PENDING, ...OPEN_UNCLOSED },
];

describe("UI-AGR-003 the kW editor reads against the agreement's nominal power (#407)", () => {
  it("UI-AGR-003 names the agreement's nominal power while editing in kW, and sums against it", () => {
    renderWithTheme({ coefficients: ROWS, nominalPowerKW: 60, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    fireEvent.click(screen.getByRole("button", { name: "Editar a mano" }));

    expect(screen.getByText("Potencia nominal del acuerdo: 60 kW")).toBeInTheDocument();
    expect(screen.getByText(/60 kW de 60 kW de potencia nominal/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/instalad/i);
  });
});
