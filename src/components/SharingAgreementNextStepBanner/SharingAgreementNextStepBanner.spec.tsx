import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";
import { selectSharingAgreementLifecycleView } from "../../pages/production/sharingAgreementLifecycle";
import type { SharingAgreementNextStep } from "../../pages/production/selectSharingAgreementNextStep";
import {
  SharingAgreementNextStepBanner,
  type LifecycleActionHandlers,
  type SharingAgreementNextStepBannerProps,
} from "./SharingAgreementNextStepBanner";

const DRAFT = SharingAgreementResponseStatus.DRAFT;
const PUBLISHED = SharingAgreementResponseStatus.PUBLISHED;
const SUPERSEDED = SharingAgreementResponseStatus.SUPERSEDED;

/** Every intent wired, so a missing button means the selector withheld it. */
const allHandlers = (): Required<LifecycleActionHandlers> => ({
  EDIT_COEFFICIENTS: vi.fn(),
  IMPORT_FILE: vi.fn(),
  PUBLISH: vi.fn(),
  DOWNLOAD_FILE: vi.fn(),
  RECORD_DATES: vi.fn(),
});

function renderBanner(
  nextStep: SharingAgreementNextStep,
  status: StatusValue = DRAFT,
  overrides: Partial<Omit<SharingAgreementNextStepBannerProps, "view">> = {},
) {
  const handlers = overrides.handlers ?? allHandlers();
  const view = selectSharingAgreementLifecycleView(nextStep, status);
  render(
    <ThemeProvider theme={theme}>
      <SharingAgreementNextStepBanner
        view={view}
        handlers={handlers}
        isClosed={view.isClosed}
        revert={overrides.revert}
      />
    </ThemeProvider>,
  );
  return handlers as Required<LifecycleActionHandlers>;
}

describe("SharingAgreementNextStepBanner", () => {
  it("leads with one sentence saying what to do now", () => {
    renderBanner({ kind: "GENERATE_AND_SEND", canGenerate: true });

    expect(screen.getByText("Siguiente paso")).toBeInTheDocument();
    expect(
      screen.getByText(
        "El reparto suma 100,0000 %. Genera el fichero, envíalo a la distribuidora y, cuando lo acepte, pon el acuerdo en vigor.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the lifecycle rail with it, so the sentence and the position are never separated", () => {
    renderBanner({ kind: "GENERATE_AND_SEND", canGenerate: true });

    expect(screen.getByRole("list", { name: "Ciclo del acuerdo de reparto" })).toBeInTheDocument();
  });

  // AC1 — an action that would fail is not rendered at all.
  describe("a draft that cannot be published yet", () => {
    it("renders no Poner en vigor button for an empty coefficient set", () => {
      renderBanner({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" });

      expect(screen.queryByRole("button", { name: "Poner en vigor" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Generar|Descargar/ })).not.toBeInTheDocument();
    });

    it("renders no Poner en vigor button when the sum is short", () => {
      renderBanner({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "SUM_MISMATCH", deltaMillionths: 250_000 });

      expect(screen.queryByRole("button", { name: "Poner en vigor" })).not.toBeInTheDocument();
    });

    it("states what is missing as visible text, not as a tooltip on an absent control", () => {
      renderBanner({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "SUM_MISMATCH", deltaMillionths: 250_000 });

      expect(
        screen.getByText(
          "«Poner en vigor» y «Generar el fichero» aparecerán cuando los coeficientes sumen 100,0000 %.",
        ),
      ).toBeVisible();
      expect(screen.getByText(/Completa el reparto: Faltan 25,0000 %/)).toBeVisible();
    });

    it("offers the two ways of authoring the split instead", async () => {
      const handlers = renderBanner({ kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" });

      await userEvent.click(screen.getByRole("button", { name: "Editar a mano" }));
      expect(handlers.EDIT_COEFFICIENTS).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getByRole("button", { name: "Importar TXT" }));
      expect(handlers.IMPORT_FILE).toHaveBeenCalledTimes(1);
    });
  });

  // AC2.
  describe("a draft that is ready", () => {
    it("promotes Poner en vigor and offers the download alongside it", async () => {
      const handlers = renderBanner({ kind: "GENERATE_AND_SEND", canGenerate: true });

      await userEvent.click(screen.getByRole("button", { name: "Poner en vigor" }));
      expect(handlers.PUBLISH).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getByRole("button", { name: "Descargar fichero" }));
      expect(handlers.DOWNLOAD_FILE).toHaveBeenCalledTimes(1);
    });

    it("withholds the download when the plant has no CAU, and says why in visible text", () => {
      renderBanner({ kind: "GENERATE_AND_SEND", canGenerate: false, blockedReason: "NO_REGULATORY_CODE" });

      expect(screen.getByRole("button", { name: "Poner en vigor" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Descargar fichero" })).not.toBeInTheDocument();
      expect(
        screen.getByText("La planta no tiene CAU configurado. Sin él no se puede generar el fichero."),
      ).toBeVisible();
    });
  });

  describe("a published agreement", () => {
    it("offers recording the outstanding dates, counted in the label", async () => {
      const handlers = renderBanner(
        { kind: "RECORD_APPLICATION_DATES", pendingCount: 4, totalCount: 12 },
        PUBLISHED,
      );

      await userEvent.click(screen.getByRole("button", { name: "Registrar fechas (4 pendientes)" }));
      expect(handlers.RECORD_DATES).toHaveBeenCalledTimes(1);
    });

    it("offers reverting to draft when nothing has been applied", async () => {
      const onClick = vi.fn();
      renderBanner({ kind: "RECORD_APPLICATION_DATES", pendingCount: 4, totalCount: 12 }, PUBLISHED, {
        revert: { label: "Volver a borrador", onClick },
      });

      await userEvent.click(screen.getByRole("button", { name: "Volver a borrador" }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("offers no action once every point has a date", () => {
      renderBanner({ kind: "ALL_DONE", totalCount: 12 }, PUBLISHED);

      expect(screen.getByText("12 puntos tienen fecha de aplicación: el reparto ya está aplicándose.")).toBeVisible();
      // Only the rail's own disclosure toggle survives.
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Ver todos los pasos" })).toBeInTheDocument();
    });
  });

  describe("a superseded agreement", () => {
    it("offers no action and never claims the record cannot be changed", () => {
      // Correcting a date and reopening a closed coefficient stay reachable in
      // the coefficient table, and reopening one puts the agreement back in
      // force — so the banner must not say otherwise.
      renderBanner({ kind: "NONE" }, SUPERSEDED);

      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Ver todos los pasos" })).toBeInTheDocument();
      expect(
        screen.getByText(
          "Este acuerdo ya no está en vigor. Puedes consultarlo y corregir fechas de aplicación; reabrir un punto vuelve a poner el acuerdo en vigor.",
        ),
      ).toBeVisible();
      expect(screen.queryByText(/solo lectura|no se puede modificar/i)).not.toBeInTheDocument();
    });
  });

  it("offers nothing, and claims no position, while the data is still in flight", () => {
    renderBanner({ kind: "NONE" }, DRAFT);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
  });

  it("renders no button for an intent the page has not wired up", () => {
    // A named intent with no handler is not a disabled button — it is nothing.
    renderBanner({ kind: "GENERATE_AND_SEND", canGenerate: true }, DRAFT, { handlers: {} });

    expect(screen.queryByRole("button", { name: "Poner en vigor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Descargar fichero" })).not.toBeInTheDocument();
  });
});
