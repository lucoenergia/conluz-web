import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementStatusChip } from "./SharingAgreementStatusChip";
import { SharingAgreementResponseStatus } from "../../api/models";

const { PUBLISHED, DRAFT, SUPERSEDED } = SharingAgreementResponseStatus;

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe("SharingAgreementStatusChip", () => {
  it("defaults to the onLight tone (unchanged from the list-page usage)", () => {
    renderWithTheme(<SharingAgreementStatusChip status={PUBLISHED} />);
    const chip = screen.getByText("Vigente").closest(".MuiChip-root");
    expect(chip).not.toHaveStyle({ backgroundColor: "rgba(255, 255, 255, 0.9)" });
  });

  it.each([
    [PUBLISHED, "Vigente"],
    [DRAFT, "Borrador"],
    [SUPERSEDED, "Histórico"],
  ])("onDark tone forces a near-opaque white pill for %s, guaranteeing contrast on a colored banner", (status, label) => {
    renderWithTheme(<SharingAgreementStatusChip status={status} tone="onDark" />);
    const chip = screen.getByText(label).closest(".MuiChip-root");
    expect(chip).toHaveStyle({ backgroundColor: "rgba(255, 255, 255, 0.9)" });
  });
});
