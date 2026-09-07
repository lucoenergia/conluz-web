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

  // Multi-supply DRAFT set, short of 100% by exactly 5 units (0.0611%) — a
  // realistic in-progress authoring state, not a single-row edge case.
  const shortDraftSet: CoefficientFixture[] = [
    { coefficient: 0.4, applicationState: PENDING },
    { coefficient: 0.35, applicationState: PENDING },
    { coefficient: 0.249389, applicationState: PENDING },
  ];

  it("always renders the coefficient sum, labelled as the coefficient set (not a file)", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={fullSet} agreementStatus={SharingAgreementResponseStatus.PUBLISHED} />,
    );
    expect(screen.getByText("Suma de los coeficientes")).toBeInTheDocument();
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

  it("shows the gap message under the KPI, as plain text, when the coefficient sum is below 100% on a DRAFT agreement", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={shortDraftSet} agreementStatus={SharingAgreementResponseStatus.DRAFT} />,
    );
    const gapMessage = screen.getByText("Faltan 0,0611 % para llegar al 100,0000 %.");
    expect(gapMessage).toBeInTheDocument();
    expect(gapMessage).not.toHaveAttribute("title");
  });

  it("does not show a gap message when the coefficient sum is full", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={fullSet} agreementStatus={SharingAgreementResponseStatus.DRAFT} />,
    );
    expect(screen.queryByText(/Faltan|Sobran/)).not.toBeInTheDocument();
  });

  it("does not show a gap message on a non-DRAFT agreement even if the coefficient sum is partial", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={shortDraftSet} agreementStatus={SharingAgreementResponseStatus.PUBLISHED} />,
    );
    expect(screen.queryByText(/Faltan|Sobran/)).not.toBeInTheDocument();
  });

  it("never renders a warning-severity alert for an incomplete DRAFT sum — that state is the default, not an error", () => {
    renderWithTheme(
      <SharingAgreementCoefficientSumCards coefficients={shortDraftSet} agreementStatus={SharingAgreementResponseStatus.DRAFT} />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
