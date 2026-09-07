import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementNextStepPanel } from "./SharingAgreementNextStepPanel";
import type { SharingAgreementNextStep } from "../../pages/production/selectSharingAgreementNextStep";

function renderPanel(nextStep: SharingAgreementNextStep) {
  return render(
    <ThemeProvider theme={theme}>
      <SharingAgreementNextStepPanel nextStep={nextStep} />
    </ThemeProvider>,
  );
}

describe("SharingAgreementNextStepPanel", () => {
  it("renders nothing for NONE", () => {
    const { container } = renderPanel({ kind: "NONE" });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders only a quiet line for ALL_DONE, with no button", () => {
    renderPanel({ kind: "ALL_DONE" });
    expect(
      screen.getByText("El reparto está en vigor y todos los coeficientes tienen fecha de aplicación."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the NO_COEFFICIENTS title/body/requirement as plain accessible text, with no button", () => {
    renderPanel({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" });

    expect(screen.getByText("Define el reparto")).toBeInTheDocument();
    expect(screen.getByText("Sube el fichero TXT de reparto o introduce los coeficientes a mano.")).toBeInTheDocument();
    const requirement = screen.getByText("Este acuerdo todavía no tiene coeficientes.");
    expect(requirement).toBeInTheDocument();
    expect(requirement).not.toHaveAttribute("title");
    expect(screen.queryByRole("button", { name: /generar|importar|editar/i })).not.toBeInTheDocument();
  });

  it("shows the missing-sum requirement with a positive delta, formatted via the shared percentage formatter", () => {
    renderPanel({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "SUM_MISMATCH", deltaMillionths: 50_000 });

    expect(screen.getByText("Ajusta el reparto")).toBeInTheDocument();
    expect(screen.getByText("Faltan 5,0000 % para llegar al 100,0000 %.")).toBeInTheDocument();
  });

  it("shows the excess-sum requirement with a negative delta", () => {
    renderPanel({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "SUM_MISMATCH", deltaMillionths: -100_000 });

    expect(screen.getByText("Sobran 10,0000 % sobre el 100,0000 %.")).toBeInTheDocument();
  });

  it("shows the generate-and-send copy with no button when generation is possible", () => {
    renderPanel({ kind: "GENERATE_AND_SEND", canGenerate: true });

    expect(screen.getByText("Genera el fichero y envíalo a la distribuidora")).toBeInTheDocument();
    expect(screen.getByText(/El envío se hace fuera de la aplicación, por email\./)).toBeInTheDocument();
    expect(screen.getByText("Cuando la distribuidora confirme que lo ha aplicado, pon el acuerdo en vigor.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generar/i })).not.toBeInTheDocument();
  });

  it("shows the missing-CAU requirement as visible text, not a tooltip, and renders no generate button", () => {
    renderPanel({ kind: "GENERATE_AND_SEND", canGenerate: false, blockedReason: "NO_REGULATORY_CODE" });

    const requirement = screen.getByText("La planta no tiene CAU configurado. Sin él no se puede generar el fichero.");
    expect(requirement).toBeInTheDocument();
    expect(requirement).not.toHaveAttribute("title");
    expect(screen.queryByRole("button", { name: /generar/i })).not.toBeInTheDocument();
  });

  it("shows the singular pendingCount form and no button", () => {
    renderPanel({ kind: "RECORD_APPLICATION_DATES", pendingCount: 1 });

    expect(screen.getByText("Registra las fechas de aplicación")).toBeInTheDocument();
    expect(screen.getByText("1 coeficiente sin fecha de aplicación.")).toBeInTheDocument();
    // The only button anywhere in the panel is the "Ver todos los pasos" disclosure toggle — never an action button.
    expect(screen.getByRole("button", { name: "Ver todos los pasos" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registrar|marcar/i })).not.toBeInTheDocument();
  });

  it("shows the plural pendingCount form", () => {
    renderPanel({ kind: "RECORD_APPLICATION_DATES", pendingCount: 3 });

    expect(screen.getByText("3 coeficientes sin fecha de aplicación.")).toBeInTheDocument();
  });

  describe('"Ver todos los pasos" disclosure', () => {
    it("lists all 5 stages, defaults to collapsed, and marks stage 1 current for AUTHOR_COEFFICIENTS", () => {
      renderPanel({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" });

      const toggle = screen.getByRole("button", { name: "Ver todos los pasos" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      expect(screen.getByText(/1\. Define el reparto/)).toBeInTheDocument();
      expect(screen.getByText(/2\. Genera el fichero/)).toBeInTheDocument();
      expect(screen.getByText(/3\. Envíalo a la distribuidora/)).toBeInTheDocument();
      expect(screen.getByText(/4\. Ponlo en vigor/)).toBeInTheDocument();
      expect(screen.getByText(/5\. Registra las fechas de aplicación/)).toBeInTheDocument();

      // Stage 1 is current: bold (700 weight), unlike the other, unmarked stages.
      expect(screen.getByText(/1\. Define el reparto/)).toHaveStyle({ fontWeight: 700 });
      expect(screen.getByText(/2\. Genera el fichero/)).toHaveStyle({ fontWeight: 600 });
    });

    it("marks stage 2 current for GENERATE_AND_SEND and never marks stage 3, even though its copy mentions sending", () => {
      renderPanel({ kind: "GENERATE_AND_SEND", canGenerate: true });

      expect(screen.getByText(/2\. Genera el fichero/)).toHaveStyle({ fontWeight: 700 });
      expect(screen.getByText(/3\. Envíalo a la distribuidora/)).toHaveStyle({ fontWeight: 600 });
    });

    it("marks stage 5 current for RECORD_APPLICATION_DATES", () => {
      renderPanel({ kind: "RECORD_APPLICATION_DATES", pendingCount: 2 });

      expect(screen.getByText(/5\. Registra las fechas de aplicación/)).toHaveStyle({ fontWeight: 700 });
    });

    it("marks stage 3 as happening outside Conluz regardless of which stage is current", () => {
      renderPanel({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" });

      expect(screen.getByText(/3\. Envíalo a la distribuidora \(fuera de Conluz\)/)).toBeInTheDocument();
    });
  });
});
