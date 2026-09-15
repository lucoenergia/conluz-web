import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementLifecycleSpine, type SharingAgreementLifecycleSpineProps } from "./SharingAgreementLifecycleSpine";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";
import { selectSharingAgreementLifecycleView } from "../../pages/production/sharingAgreementLifecycle";
import type { SharingAgreementNextStep } from "../../pages/production/selectSharingAgreementNextStep";

const DRAFT = SharingAgreementResponseStatus.DRAFT;
const PUBLISHED = SharingAgreementResponseStatus.PUBLISHED;
const SUPERSEDED = SharingAgreementResponseStatus.SUPERSEDED;

function renderSpine(
  nextStep: SharingAgreementNextStep,
  status: StatusValue = DRAFT,
  actions: Omit<SharingAgreementLifecycleSpineProps, "view"> = {},
) {
  return render(
    <ThemeProvider theme={theme}>
      <SharingAgreementLifecycleSpine
        view={selectSharingAgreementLifecycleView(nextStep, status)}
        {...actions}
      />
    </ThemeProvider>,
  );
}

/** The rail's accessible narration for one stage. */
function stageNarration(stageNumber: number) {
  return screen.getByText(new RegExp(`^Paso ${stageNumber}:`));
}

describe("SharingAgreementLifecycleSpine", () => {
  it("always shows the five-stage rail, even before a position is known", () => {
    renderSpine({ kind: "NONE" });

    const rail = screen.getByRole("list", { name: "Ciclo del acuerdo de reparto" });
    expect(within(rail).getAllByRole("listitem")).toHaveLength(5);
  });

  it("claims no current stage while the data is still loading", () => {
    renderSpine({ kind: "NONE" });

    expect(document.querySelector('[aria-current="step"]')).toBeNull();
  });

  it("narrates each stage's number, title and state for assistive technology", () => {
    renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: true });

    expect(stageNarration(1)).toHaveTextContent("Paso 1: Define el reparto — completado");
    expect(stageNarration(2)).toHaveTextContent("Paso 2: Genera el fichero — paso actual");
    expect(stageNarration(3)).toHaveTextContent(
      "Paso 3: Envíalo a la distribuidora — fuera de Conluz, no verificable",
    );
    expect(stageNarration(4)).toHaveTextContent("Paso 4: Ponlo en vigor — paso actual");
    expect(stageNarration(5)).toHaveTextContent("Paso 5: Registra las fechas de aplicación — pendiente");
  });

  it("marks both ends of the span as the current step, not just one of them", () => {
    renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: true });

    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(2);
  });

  describe("current-step copy", () => {
    it("shows the NO_COEFFICIENTS title, body and requirement", () => {
      renderSpine({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" });

      expect(screen.getByText("Define el reparto")).toBeInTheDocument();
      expect(screen.getByText("Sube el fichero TXT de reparto o introduce los coeficientes a mano.")).toBeInTheDocument();
      expect(screen.getByText("Este acuerdo todavía no tiene coeficientes.")).toBeInTheDocument();
    });

    it("shows the generate-and-send copy, including that sending happens outside the application", () => {
      renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: true });

      expect(screen.getByText("Genera el fichero y envíalo a la distribuidora")).toBeInTheDocument();
      expect(screen.getByText(/El envío se hace fuera de la aplicación, por email\./)).toBeInTheDocument();
      expect(
        screen.getByText("Cuando la distribuidora confirme que lo ha aplicado, pon el acuerdo en vigor."),
      ).toBeInTheDocument();
    });

    it("shows the pending-count requirement for stage 5", () => {
      renderSpine({ kind: "RECORD_APPLICATION_DATES", pendingCount: 3 }, PUBLISHED);

      expect(screen.getByText("Registra las fechas de aplicación")).toBeInTheDocument();
      expect(screen.getByText("3 coeficientes sin fecha de aplicación.")).toBeInTheDocument();
    });

    it("shows a quiet completion line, and no action, once the cycle is finished", () => {
      renderSpine({ kind: "ALL_DONE" }, PUBLISHED);

      expect(
        screen.getByText("El reparto está en vigor y todos los coeficientes tienen fecha de aplicación."),
      ).toBeInTheDocument();
      // The disclosure toggle is the only button the rail renders on its own.
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Ver todos los pasos" })).toBeInTheDocument();
    });

    it("states that a superseded agreement's cycle is closed, with no step to act on", () => {
      renderSpine({ kind: "NONE" }, SUPERSEDED);

      expect(
        screen.getByText("Este acuerdo fue sustituido por otro. Su ciclo está cerrado."),
      ).toBeInTheDocument();
      expect(document.querySelector('[aria-current="step"]')).toBeNull();
    });
  });

  describe("actions", () => {
    it("runs the handler for an available action", async () => {
      const publish = { label: "Poner en vigor", onClick: vi.fn() };
      const user = userEvent.setup();
      renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: true }, DRAFT, { publish });

      await user.click(screen.getByRole("button", { name: "Poner en vigor" }));
      expect(publish.onClick).toHaveBeenCalled();
    });

    it("keeps a gated action focusable and described instead of removing it from the tab order", () => {
      const publish = { label: "Poner en vigor", onClick: vi.fn(), disabledReason: "Faltan coeficientes." };
      renderSpine({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" }, DRAFT, { publish });

      const button = screen.getByRole("button", { name: "Poner en vigor" });
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
      const describedBy = button.getAttribute("aria-describedby") as string;
      expect(document.getElementById(describedBy)).toHaveTextContent("Faltan coeficientes.");
    });

    it("does not run the handler for a gated action", async () => {
      const publish = { label: "Poner en vigor", onClick: vi.fn(), disabledReason: "Faltan coeficientes." };
      const user = userEvent.setup();
      renderSpine({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" }, DRAFT, { publish });

      await user.click(screen.getByRole("button", { name: "Poner en vigor" }));
      expect(publish.onClick).not.toHaveBeenCalled();
    });

    it("offers both span actions at once — the admin decides when they have sent the file", () => {
      renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: true }, DRAFT, {
        generate: { label: "Generar fichero", onClick: vi.fn() },
        publish: { label: "Poner en vigor", onClick: vi.fn() },
      });

      expect(screen.getByRole("button", { name: "Generar fichero" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Poner en vigor" })).toBeInTheDocument();
    });

    it("prints a shared reason once, not twice, when a gated action repeats the stage requirement", () => {
      const reason = "La planta no tiene CAU configurado. Sin él no se puede generar el fichero.";
      renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: false, blockedReason: "NO_REGULATORY_CODE" }, DRAFT, {
        generate: { label: "Generar fichero", onClick: vi.fn(), disabledReason: reason },
      });

      expect(screen.getAllByText(reason)).toHaveLength(1);
    });
  });

  describe('"Ver todos los pasos" disclosure', () => {
    it("lists all five stages and starts collapsed", () => {
      renderSpine({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" });

      expect(screen.getByRole("button", { name: "Ver todos los pasos" })).toHaveAttribute("aria-expanded", "false");

      expect(screen.getByText(/1\. Define el reparto/)).toBeInTheDocument();
      expect(screen.getByText(/2\. Genera el fichero/)).toBeInTheDocument();
      expect(screen.getByText(/3\. Envíalo a la distribuidora/)).toBeInTheDocument();
      expect(screen.getByText(/4\. Ponlo en vigor/)).toBeInTheDocument();
      expect(screen.getByText(/5\. Registra las fechas de aplicación/)).toBeInTheDocument();
    });

    it("expands on click", async () => {
      const user = userEvent.setup();
      renderSpine({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" });

      await user.click(screen.getByRole("button", { name: "Ver todos los pasos" }));
      expect(screen.getByRole("button", { name: "Ver todos los pasos" })).toHaveAttribute("aria-expanded", "true");
    });

    it("bolds the current stage and leaves the others unmarked", () => {
      renderSpine({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" });

      expect(screen.getByText(/1\. Define el reparto/)).toHaveStyle({ fontWeight: 700 });
      expect(screen.getByText(/2\. Genera el fichero/)).toHaveStyle({ fontWeight: 600 });
    });

    it("bolds both span stages when the generate-and-send phase is live", () => {
      renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: true });

      expect(screen.getByText(/2\. Genera el fichero/)).toHaveStyle({ fontWeight: 700 });
      expect(screen.getByText(/4\. Ponlo en vigor/)).toHaveStyle({ fontWeight: 700 });
    });

    it("marks stage 3 as happening outside Conluz, and never bolds it as current", () => {
      renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: true });

      const stage3 = screen.getByText(/3\. Envíalo a la distribuidora \(fuera de Conluz\)/);
      expect(stage3).toBeInTheDocument();
      expect(stage3).toHaveStyle({ fontWeight: 600 });
    });
  });
});
