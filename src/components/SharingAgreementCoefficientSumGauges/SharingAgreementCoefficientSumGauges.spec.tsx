import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementCoefficientSumGauges } from "./SharingAgreementCoefficientSumGauges";
import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { CoefficientSummable } from "../../pages/production/sharingAgreementCoefficientSums";
import { formatCoefficientGapMessage } from "../../pages/production/sharingAgreementGapMessage";

const PENDING = SharingAgreementPartitionCoefficientResponseApplicationState.PENDING;

const FULL: CoefficientSummable[] = [
  { coefficient: 0.75, applicationState: PENDING },
  { coefficient: 0.25, applicationState: PENDING },
];

const INCOMPLETE: CoefficientSummable[] = [
  { coefficient: 0.5, applicationState: PENDING },
  { coefficient: 0.25, applicationState: PENDING },
];

function renderGauges(coefficients: CoefficientSummable[]) {
  return render(
    <ThemeProvider theme={theme}>
      <SharingAgreementCoefficientSumGauges coefficients={coefficients} />
    </ThemeProvider>,
  );
}

describe("SharingAgreementCoefficientSumGauges", () => {
  it("renders the coefficient sum, labelled as the coefficient set (not a file)", () => {
    renderGauges(FULL);

    expect(screen.getByText("Suma de los coeficientes")).toBeInTheDocument();
  });

  it("never renders an applied sum — application progress is the application panel's job", () => {
    renderGauges(FULL);

    expect(screen.queryByText("Suma aplicada")).not.toBeInTheDocument();
    expect(screen.queryByText("Suma aplicada al cierre")).not.toBeInTheDocument();
  });

  it("exposes the sum as a labelled gauge carrying the exact figure, not the rounded bar value", () => {
    renderGauges(INCOMPLETE);

    const gauge = screen.getByRole("progressbar", { name: "Suma de los coeficientes" });
    expect(gauge).toHaveAttribute("aria-valuetext", expect.stringContaining("75,0000"));
  });

  describe("the coefficient-sum gap", () => {
    it("states the shortfall under the gauge, as plain text", () => {
      renderGauges(INCOMPLETE);

      const expected = (formatCoefficientGapMessage(250_000) as string).replace(/\u00A0/g, " ");
      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it("states no gap when the coefficient sum is full", () => {
      renderGauges(FULL);

      expect(screen.queryByText(/^Faltan /)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Sobran /)).not.toBeInTheDocument();
    });

    it("never renders a warning-severity alert for an incomplete sum — that state is the default, not an error", () => {
      renderGauges(INCOMPLETE);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
