import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ThemeProvider } from "@mui/material/styles";
import { CorrectCoefficientDateConfirmationModal } from "./CorrectCoefficientDateConfirmationModal";
import { theme } from "../../theme";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

const { APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN } = SharingAgreementPartitionCoefficientResponseEndState;

const coefficient = (id: string, name: string, validFrom: string): SharingAgreementPartitionCoefficientResponse => ({
  coefficientId: id,
  supply: { id: `s-${id}`, name, code: `ES${id}` },
  coefficient: 0.5,
  applicationState: APPLIED,
  endState: OPEN,
  validFrom,
  validTo: null,
  endDate: null,
});

function setup(coefficients: SharingAgreementPartitionCoefficientResponse[]) {
  // Rendered inside the app theme so the date field carries the same locale it
  // does in production; without it the sections fall back to English.
  render(
    <ThemeProvider theme={theme}>
    <CorrectCoefficientDateConfirmationModal
      isOpen
      coefficients={coefficients as [SharingAgreementPartitionCoefficientResponse, ...SharingAgreementPartitionCoefficientResponse[]]}
      isPending={false}
      errorMessages={null}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
    />
    </ThemeProvider>,
  );
}

describe("CorrectCoefficientDateConfirmationModal — batch distinct-dates handling", () => {
  it("a single coefficient (row path) is never prefilled, unchanged from before batch dialogs existed", () => {
    setup([coefficient("c1", "Vivienda A", "2026-01-01T00:00:00Z")]);
    const dayField = screen.getByRole("spinbutton", { name: "Dia" });
    expect(dayField).toHaveTextContent("DD");
    expect(screen.queryByText(/fechas de aplicación distintas/)).not.toBeInTheDocument();
  });

  it("a batch sharing one current date shows no distinct-dates line and prefills that date", () => {
    setup([coefficient("c1", "Vivienda A", "2026-01-15T00:00:00Z"), coefficient("c2", "Vivienda B", "2026-01-15T00:00:00Z")]);
    expect(screen.queryByText(/fechas de aplicación distintas/)).not.toBeInTheDocument();
    const dayField = screen.getByRole("spinbutton", { name: "Dia" });
    expect(dayField).toHaveTextContent("15");
  });

  it("a batch split across distinct current dates shows the count and leaves the field empty", () => {
    setup([coefficient("c1", "Vivienda A", "2026-01-15T00:00:00Z"), coefficient("c2", "Vivienda B", "2026-02-20T00:00:00Z")]);
    expect(screen.getByText("Tienen 2 fechas de aplicación distintas; todas pasarán a la fecha que indiques.")).toBeInTheDocument();
    const dayField = screen.getByRole("spinbutton", { name: "Dia" });
    expect(dayField).toHaveTextContent("DD");
  });

  it("renders the multi-target CUPS summary instead of the single CUPS chip once more than one coefficient is passed", () => {
    setup([coefficient("c1", "Vivienda A", "2026-01-15T00:00:00Z"), coefficient("c2", "Vivienda B", "2026-01-15T00:00:00Z")]);
    expect(screen.getByText("2 coeficientes seleccionados")).toBeInTheDocument();
    expect(screen.getByText(/Vivienda A/)).toBeInTheDocument();
    expect(screen.getByText(/Vivienda B/)).toBeInTheDocument();
  });

  it("reports how many targets are hidden by the filter", () => {
    render(
      <CorrectCoefficientDateConfirmationModal
        isOpen
        coefficients={[coefficient("c1", "Vivienda A", "2026-01-15T00:00:00Z"), coefficient("c2", "Vivienda B", "2026-01-15T00:00:00Z")]}
        hiddenCount={1}
        isPending={false}
        errorMessages={null}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("1 no se ve con el filtro actual")).toBeInTheDocument();
  });
});
