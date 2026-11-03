import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementStatusChip } from "./SharingAgreementStatusChip";
import { SharingAgreementResponseStatus } from "../../api/models";
import { colors } from "../../theme/tokens";
import { expectNeutralStatusChip } from "./expectNeutralStatusChip";

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

  it.each([
    [PUBLISHED, "Vigente"],
    [DRAFT, "Borrador"],
    [SUPERSEDED, "Histórico"],
  ])("UI-AGR-016 %s carries no warning or error palette", (status, label) => {
    renderWithTheme(<SharingAgreementStatusChip status={status} />);
    expectNeutralStatusChip(screen.getByText(label));
  });

  it("UI-AGR-016 a draft is a dashed outline on a transparent background, in the secondary text colour", () => {
    renderWithTheme(<SharingAgreementStatusChip status={DRAFT} />);
    // Structural: the palette is the subject (see expectNeutralStatusChip).
    const chip = screen.getByText("Borrador").closest(".MuiChip-root");
    expect(chip).toHaveStyle({ borderStyle: "dashed", backgroundColor: "rgba(0, 0, 0, 0)", color: colors.text.secondary });
  });
});
