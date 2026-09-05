import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementDraftProgressStrip } from "./SharingAgreementDraftProgressStrip";
import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { CoefficientSummable } from "../../pages/production/sharingAgreementCoefficientSums";

const { PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;

const fullSum: CoefficientSummable[] = [{ coefficient: 1, applicationState: PENDING }];
const partialSum: CoefficientSummable[] = [{ coefficient: 0.5, applicationState: PENDING }];

function renderStrip(coefficients: CoefficientSummable[], hasFile: boolean) {
  return render(
    <ThemeProvider theme={theme}>
      <SharingAgreementDraftProgressStrip coefficients={coefficients} hasFile={hasFile} />
    </ThemeProvider>,
  );
}

describe("SharingAgreementDraftProgressStrip", () => {
  it("renders all four step labels", () => {
    renderStrip(partialSum, false);
    expect(screen.getByText("Reparto")).toBeInTheDocument();
    expect(screen.getByText("Fichero")).toBeInTheDocument();
    expect(screen.getByText("Envío")).toBeInTheDocument();
    expect(screen.getByText("Vigente")).toBeInTheDocument();
  });

  it("never renders Envío as done, regardless of the other steps' state", () => {
    renderStrip(fullSum, true);
    // Only one CheckCircleOutlineIcon should exist per "done" step (Reparto,
    // Fichero here); Envío always keeps its InfoOutlinedIcon, never a checkmark.
    expect(screen.getByTestId("InfoOutlinedIcon")).toBeInTheDocument();
    expect(screen.getAllByTestId("CheckCircleOutlineIcon")).toHaveLength(2);
  });

  it("marks Fichero done when hasFile is true even though Reparto is not full (sum incomplete)", () => {
    renderStrip(partialSum, true);
    // Reparto (not full) renders its number "1", not a checkmark; Fichero
    // (hasFile=true) renders a checkmark — proving generate isn't required
    // for Fichero to read as done, only an imported file is.
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getAllByTestId("CheckCircleOutlineIcon")).toHaveLength(1);
  });

  it("shows neither step done when the sum is incomplete and there is no file", () => {
    renderStrip(partialSum, false);
    expect(screen.queryByTestId("CheckCircleOutlineIcon")).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
