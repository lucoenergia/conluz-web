import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementCoefficientSet } from "./SharingAgreementCoefficientSet";
import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const coefficients: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "1", supply: { name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.4, applicationState: APPLIED },
  { coefficientId: "2", supply: { name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.6, applicationState: PENDING },
  { coefficientId: "3", supply: { name: "Nave Vacía", code: "ES0031300000000003EF" }, coefficient: 0, applicationState: APPLIED },
];

describe("SharingAgreementCoefficientSet", () => {
  it("uses the exact search placeholder", () => {
    renderWithTheme(<SharingAgreementCoefficientSet coefficients={coefficients} />);
    expect(screen.getByPlaceholderText("Buscar por punto o CUPS")).toBeInTheDocument();
  });

  it("renders the zero-coefficients empty state when the agreement has none at all", () => {
    renderWithTheme(<SharingAgreementCoefficientSet coefficients={[]} />);
    expect(screen.getByText("Sin coeficientes de reparto")).toBeInTheDocument();
    expect(screen.queryByText("No se encontraron coeficientes")).not.toBeInTheDocument();
  });

  it("never hides a coefficient: 0 row by default", () => {
    renderWithTheme(<SharingAgreementCoefficientSet coefficients={coefficients} />);
    expect(screen.getAllByText("Nave Vacía").length).toBeGreaterThan(0);
  });

  it("renders the filtered-empty state (distinct copy) when a chip filter matches nothing", () => {
    const allPending: SharingAgreementPartitionCoefficientResponse[] = [
      { coefficientId: "1", supply: { name: "Vivienda A", code: "X" }, coefficient: 1, applicationState: PENDING },
    ];
    renderWithTheme(<SharingAgreementCoefficientSet coefficients={allPending} />);

    fireEvent.click(screen.getByRole("button", { name: "Aplicado" }));

    expect(screen.getByText("No se encontraron coeficientes")).toBeInTheDocument();
    expect(screen.queryByText("Sin coeficientes de reparto")).not.toBeInTheDocument();
  });

  it("filters rows by applicationState chip", () => {
    renderWithTheme(<SharingAgreementCoefficientSet coefficients={coefficients} />);

    fireEvent.click(screen.getByRole("button", { name: "Pendiente de tratamiento" }));

    expect(screen.getAllByText("Vivienda B").length).toBeGreaterThan(0);
    expect(screen.queryByText("Vivienda A")).not.toBeInTheDocument();
  });
});
