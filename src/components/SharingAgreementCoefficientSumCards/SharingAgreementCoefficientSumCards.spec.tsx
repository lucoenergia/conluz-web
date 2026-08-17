import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementCoefficientSumCards } from "./SharingAgreementCoefficientSumCards";
import { SharingAgreementPartitionCoefficientResponseApplicationState, SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

const { APPLIED, PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("SharingAgreementCoefficientSumCards", () => {
  const fullSet: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficient: 0.5, applicationState: APPLIED },
    { coefficient: 0.5, applicationState: APPLIED },
  ];

  const partialSet: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficient: 0.5, applicationState: APPLIED },
    { coefficient: 0.5, applicationState: PENDING },
  ];

  it("always renders the file sum", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={fullSet} agreementStatus={SharingAgreementResponseStatus.PUBLISHED} />,
    );
    expect(screen.getByText("Suma del fichero")).toBeInTheDocument();
  });

  it("does not render the applied sum when the agreement is DRAFT", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={fullSet} agreementStatus={SharingAgreementResponseStatus.DRAFT} />,
    );
    expect(screen.queryByText("Suma aplicada")).not.toBeInTheDocument();
  });

  it("renders the applied sum for PUBLISHED and SUPERSEDED agreements", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={fullSet} agreementStatus={SharingAgreementResponseStatus.PUBLISHED} />,
    );
    expect(screen.getByText("Suma aplicada")).toBeInTheDocument();
  });

  it("shows the informational, non-error copy when the applied sum is below 100%", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={partialSet} agreementStatus={SharingAgreementResponseStatus.PUBLISHED} />,
    );
    expect(screen.getByText(/normal en transición/)).toBeInTheDocument();
  });

  it("does not show the transitional copy when the applied sum reaches 100%", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={fullSet} agreementStatus={SharingAgreementResponseStatus.PUBLISHED} />,
    );
    expect(screen.queryByText(/normal en transición/)).not.toBeInTheDocument();
  });
});
