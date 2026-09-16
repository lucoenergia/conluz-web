import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementLifecycleSpine } from "./SharingAgreementLifecycleSpine";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";
import { selectSharingAgreementLifecycleView } from "../../pages/production/sharingAgreementLifecycle";
import type { SharingAgreementNextStep } from "../../pages/production/selectSharingAgreementNextStep";

const DRAFT = SharingAgreementResponseStatus.DRAFT;
const SUPERSEDED = SharingAgreementResponseStatus.SUPERSEDED;

function renderSpine(nextStep: SharingAgreementNextStep, status: StatusValue = DRAFT) {
  return render(
    <ThemeProvider theme={theme}>
      <SharingAgreementLifecycleSpine view={selectSharingAgreementLifecycleView(nextStep, status)} />
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

  describe("what the rail no longer carries", () => {
    // The sentence describing the current step, and the control that performs
    // it, live in the next-step banner. Rendering both meant one instruction
    // printed twice on a single screen.
    it("does not restate the current step's title or body", () => {
      renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: true });

      expect(screen.queryByText("Genera el fichero y envíalo a la distribuidora")).not.toBeInTheDocument();
      expect(screen.queryByText(/El envío se hace fuera de la aplicación, por email\./)).not.toBeInTheDocument();
    });

    it("renders no action other than its own disclosure toggle", () => {
      renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: true });

      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Ver todos los pasos" })).toBeInTheDocument();
    });
  });

  describe("position caption", () => {
    it("names the live span rather than pretending to know which of its stages is current", () => {
      renderSpine({ kind: "GENERATE_AND_SEND", canGenerate: true });

      expect(
        screen.getByText("Pasos 2, 3 y 4 en curso · Conluz no puede saber en cuál estás"),
      ).toBeInTheDocument();
    });

    it("says nothing about position while the data is still in flight", () => {
      renderSpine({ kind: "NONE" });

      expect(screen.queryByText(/^Paso \d de 5/)).not.toBeInTheDocument();
      expect(screen.queryByText("Ciclo cerrado · acuerdo histórico")).not.toBeInTheDocument();
    });

    it("reads as closed, not as in progress, for a superseded agreement", () => {
      renderSpine({ kind: "NONE" }, SUPERSEDED);

      expect(screen.getByText("Ciclo cerrado · acuerdo histórico")).toBeInTheDocument();
      expect(document.querySelector('[aria-current="step"]')).toBeNull();
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

    it("expands on click, and its label states what the next click will do", async () => {
      const user = userEvent.setup();
      renderSpine({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" });

      await user.click(screen.getByRole("button", { name: "Ver todos los pasos" }));

      const toggle = screen.getByRole("button", { name: "Ocultar los pasos" });
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(document.getElementById(toggle.getAttribute("aria-controls") as string)).toBeInTheDocument();
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
