import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementCoefficientSumGauges } from "./SharingAgreementCoefficientSumGauges";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";
import type { CoefficientSummable } from "../../pages/production/sharingAgreementCoefficientSums";
import { formatCoefficientGapMessage } from "../../pages/production/sharingAgreementGapMessage";

const PENDING = SharingAgreementPartitionCoefficientResponseApplicationState.PENDING;
const APPLIED = SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED;

const DRAFT = SharingAgreementResponseStatus.DRAFT;
const PUBLISHED = SharingAgreementResponseStatus.PUBLISHED;
const SUPERSEDED = SharingAgreementResponseStatus.SUPERSEDED;

/** Sums to exactly 100%, with three quarters of it applied. */
const PARTIALLY_APPLIED: CoefficientSummable[] = [
  { coefficient: 0.75, applicationState: APPLIED },
  { coefficient: 0.25, applicationState: PENDING },
];

const FULLY_APPLIED: CoefficientSummable[] = [
  { coefficient: 0.6, applicationState: APPLIED },
  { coefficient: 0.4, applicationState: APPLIED },
];

const INCOMPLETE: CoefficientSummable[] = [
  { coefficient: 0.5, applicationState: PENDING },
  { coefficient: 0.25, applicationState: PENDING },
];

const TRANSITION_COPY = /normal en transición mientras la distribuidora aplica los coeficientes pendientes/;

function renderGauges(coefficients: CoefficientSummable[], agreementStatus: StatusValue | undefined) {
  return render(
    <ThemeProvider theme={theme}>
      <SharingAgreementCoefficientSumGauges coefficients={coefficients} agreementStatus={agreementStatus} />
    </ThemeProvider>,
  );
}

describe("SharingAgreementCoefficientSumGauges", () => {
  it("always renders the coefficient sum, labelled as the coefficient set (not a file)", () => {
    renderGauges(PARTIALLY_APPLIED, DRAFT);

    expect(screen.getByText("Suma de los coeficientes")).toBeInTheDocument();
  });

  it("does not render the applied sum when the agreement is DRAFT", () => {
    renderGauges(PARTIALLY_APPLIED, DRAFT);

    expect(screen.queryByText("Suma aplicada")).not.toBeInTheDocument();
    expect(screen.queryByText("Suma aplicada al cierre")).not.toBeInTheDocument();
  });

  it("renders the applied sum for a PUBLISHED agreement", () => {
    renderGauges(PARTIALLY_APPLIED, PUBLISHED);

    expect(screen.getByText("Suma aplicada")).toBeInTheDocument();
  });

  it("exposes each sum as a labelled gauge carrying the exact figure, not the rounded bar value", () => {
    renderGauges(PARTIALLY_APPLIED, PUBLISHED);

    const applied = screen.getByRole("progressbar", { name: "Suma aplicada" });
    // 75% of the bar, but the announced value keeps the precision the distributor validates.
    expect(applied).toHaveAttribute("aria-valuetext", expect.stringContaining("75,0000"));
  });

  describe("the transition caption is gated on PUBLISHED, not merely on 'not draft'", () => {
    it("shows it for a PUBLISHED agreement whose applied sum is still below 100%", () => {
      renderGauges(PARTIALLY_APPLIED, PUBLISHED);

      expect(screen.getByText(TRANSITION_COPY)).toBeInTheDocument();
    });

    it("does not show it once the applied sum reaches 100%", () => {
      renderGauges(FULLY_APPLIED, PUBLISHED);

      expect(screen.queryByText(TRANSITION_COPY)).not.toBeInTheDocument();
    });

    it("never shows it for a SUPERSEDED agreement — nothing is pending on a record the distributor finished with", () => {
      renderGauges(PARTIALLY_APPLIED, SUPERSEDED);

      expect(screen.queryByText(TRANSITION_COPY)).not.toBeInTheDocument();
    });

    it("labels a superseded agreement's applied sum as a closing figure rather than a live one", () => {
      renderGauges(PARTIALLY_APPLIED, SUPERSEDED);

      expect(screen.getByText("Suma aplicada al cierre")).toBeInTheDocument();
      expect(screen.queryByText("Suma aplicada")).not.toBeInTheDocument();
    });
  });

  describe("the coefficient-sum gap", () => {
    it("states the shortfall under the gauge, as plain text, on a DRAFT agreement", () => {
      renderGauges(INCOMPLETE, DRAFT);

      const expected = (formatCoefficientGapMessage(250_000) as string).replace(/\u00A0/g, " ");
      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it("states no gap when the coefficient sum is full", () => {
      renderGauges(PARTIALLY_APPLIED, DRAFT);

      expect(screen.queryByText(/^Faltan /)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Sobran /)).not.toBeInTheDocument();
    });

    it("states no gap on a non-DRAFT agreement even if the coefficient sum is partial", () => {
      renderGauges(INCOMPLETE, PUBLISHED);

      expect(screen.queryByText(/^Faltan /)).not.toBeInTheDocument();
    });

    it("never renders a warning-severity alert for an incomplete DRAFT sum — that state is the default, not an error", () => {
      renderGauges(INCOMPLETE, DRAFT);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
