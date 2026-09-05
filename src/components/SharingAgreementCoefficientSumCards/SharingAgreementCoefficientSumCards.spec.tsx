import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementCoefficientSumCards } from "./SharingAgreementCoefficientSumCards";
import { SharingAgreementPartitionCoefficientResponseApplicationState, SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementCoefficientSumCardsProps } from "./SharingAgreementCoefficientSumCards";

const { APPLIED, PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;
type CoefficientFixture = SharingAgreementCoefficientSumCardsProps["coefficients"][number];

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("SharingAgreementCoefficientSumCards", () => {
  const fullSet: CoefficientFixture[] = [
    { coefficient: 0.5, applicationState: APPLIED },
    { coefficient: 0.5, applicationState: APPLIED },
  ];

  const partialSet: CoefficientFixture[] = [
    { coefficient: 0.5, applicationState: APPLIED },
    { coefficient: 0.5, applicationState: PENDING },
  ];

  const partialFileSumSet: CoefficientFixture[] = [
    { coefficient: 0.3, applicationState: PENDING },
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

  it("shows a blocking warning when the file sum is below 100% on a DRAFT agreement", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards
        coefficients={partialFileSumSet}
        agreementStatus={SharingAgreementResponseStatus.DRAFT}
      />,
    );
    expect(
      screen.getByText(/La suma del fichero debe ser exactamente 100\s% para poder generar el fichero de reparto/),
    ).toBeInTheDocument();
  });

  it("does not show the blocking warning when the file sum is full", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={fullSet} agreementStatus={SharingAgreementResponseStatus.DRAFT} />,
    );
    expect(screen.queryByText(/para poder generar el fichero de reparto/)).not.toBeInTheDocument();
  });

  it("does not show the blocking warning on a non-DRAFT agreement even if the file sum is partial", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards
        coefficients={partialFileSumSet}
        agreementStatus={SharingAgreementResponseStatus.PUBLISHED}
      />,
    );
    expect(screen.queryByText(/para poder generar el fichero de reparto/)).not.toBeInTheDocument();
  });
});
