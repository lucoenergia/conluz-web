import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import {
  useGenerateSharingAgreementDistributorFile,
  useUploadSharingAgreementFile,
} from "../../api/sharing-agreements/sharing-agreements";
import {
  COEFFICIENT_SCALE,
  computeSharingAgreementCoefficientSums,
} from "../../pages/production/sharingAgreementCoefficientSums";
import { formatCoefficientGapMessage } from "../../pages/production/sharingAgreementGapMessage";
import { SharingAgreementFilePanel } from "./SharingAgreementFilePanel";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementFileResponse, SharingAgreementResponse } from "../../api/models";
import type { CoefficientSummable } from "../../pages/production/sharingAgreementCoefficientSums";

const { PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;

const mockErrorDispatch = vi.fn();
const mockDownload = vi.fn();
const mockUploadMutateAsync = vi.fn();
const mockGenerateMutateAsync = vi.fn();

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock(import("./downloadSharingAgreementFile"), async (importOriginal) => ({
  ...(await importOriginal()),
  downloadSharingAgreementFile: (...args: unknown[]) => mockDownload(...args),
}));

vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUploadSharingAgreementFile: vi.fn(),
  useGenerateSharingAgreementDistributorFile: vi.fn(),
}));

const fullSumCoefficients: CoefficientSummable[] = [{ coefficient: 1, applicationState: PENDING }];
const partialSumCoefficients: CoefficientSummable[] = [{ coefficient: 0.5, applicationState: PENDING }];

// `file` is nullable at runtime (see SharingAgreementFilePanel.tsx's own
// defensive note) even though Orval typed it as always-present — accept null
// here too, and cast the fixture as a whole rather than fighting the type.
type AgreementOverrides = Partial<Omit<SharingAgreementResponse, "file">> & {
  file?: SharingAgreementFileResponse | null;
};

function makeAgreement(overrides: AgreementOverrides = {}): SharingAgreementResponse {
  return {
    id: "agreement-1",
    plantId: "plant-1",
    name: "Reparto",
    notes: null,
    status: SharingAgreementResponseStatus.DRAFT,
    installedPowerKw: 100,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: "user-1",
    file: null,
    ...overrides,
  } as SharingAgreementResponse;
}

function renderPanel(overrides: {
  agreement?: SharingAgreementResponse;
  coefficients?: CoefficientSummable[];
  plantRegulatoryCode?: string | undefined;
} = {}) {
  const agreement = overrides.agreement ?? makeAgreement();
  const coefficients = overrides.coefficients ?? fullSumCoefficients;
  // Not a destructuring default: an explicit `plantRegulatoryCode: undefined`
  // must stay undefined for the "no CAU" tests, not silently fall back.
  const plantRegulatoryCode = "plantRegulatoryCode" in overrides ? overrides.plantRegulatoryCode : "CAU0001";
  vi.mocked(useUploadSharingAgreementFile).mockReturnValue(mutation.idle({ mutateAsync: mockUploadMutateAsync }));
  vi.mocked(useGenerateSharingAgreementDistributorFile).mockReturnValue(
    mutation.idle({ mutateAsync: mockGenerateMutateAsync }),
  );

  const Harness = () => {
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
    return (
      <SharingAgreementFilePanel
        plantId="plant-1"
        sharingAgreementId="agreement-1"
        agreement={agreement}
        coefficients={coefficients}
        plantRegulatoryCode={plantRegulatoryCode}
        isGenerateDialogOpen={isGenerateDialogOpen}
        onGenerateDialogOpenChange={setIsGenerateDialogOpen}
      />
    );
  };

  return renderWithProviders(<Harness />);
}

describe("SharingAgreementFilePanel", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockDownload.mockClear();
    mockUploadMutateAsync.mockClear();
    mockGenerateMutateAsync.mockClear();
  });

  const GENERATE = "Generar y descargar TXT";

  it("names the section and says what the file is for, in every status", () => {
    renderPanel();
    expect(screen.getByRole("heading", { level: 2, name: "Fichero para la distribuidora" })).toBeInTheDocument();
    expect(
      screen.getByText("El TXT con los coeficientes que la distribuidora necesita para aplicar el reparto."),
    ).toBeVisible();
  });

  it("keeps one title across statuses, so the load signal and the section identity don't change under the user", () => {
    const published = makeAgreement({ status: SharingAgreementResponseStatus.PUBLISHED });
    renderPanel({ agreement: published });
    expect(screen.getByRole("heading", { level: 2, name: "Fichero para la distribuidora" })).toBeInTheDocument();
    expect(screen.queryByText("Fichero enviado a la distribuidora")).not.toBeInTheDocument();
  });

  // AC10.
  describe('"Generar y descargar"', () => {
    it("states that nothing is stored, before the user generates anything", () => {
      renderPanel();
      expect(
        screen.getByText(/Conluz no guarda el fichero: se descarga en tu dispositivo y lo envías tú\./),
      ).toBeVisible();
      expect(mockDownload).not.toHaveBeenCalled();
    });

    it("is offered in every status — generate-file is allowed for DRAFT, PUBLISHED and SUPERSEDED", () => {
      for (const status of [
        SharingAgreementResponseStatus.DRAFT,
        SharingAgreementResponseStatus.PUBLISHED,
        SharingAgreementResponseStatus.SUPERSEDED,
      ]) {
        const { unmount } = renderPanel({ agreement: makeAgreement({ status }) });
        expect(screen.getByRole("button", { name: GENERATE })).toBeInTheDocument();
        unmount();
      }
    });

    // AC4 — the panel used to use a real `disabled`, which takes the reason out
    // of reach of the keyboard. It now gates the way every other control does.
    it("stays focusable when gated, with its reason as visible text bound via aria-describedby", async () => {
      renderPanel({ coefficients: partialSumCoefficients });

      const button = screen.getByRole("button", { name: GENERATE });
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).not.toHaveAttribute("title");

      const describedBy = button.getAttribute("aria-describedby") as string;
      expect(document.getElementById(describedBy)).toBeVisible();

      await userEvent.click(button);
      expect(screen.queryByRole("heading", { name: "Generar fichero" })).not.toBeInTheDocument();
    });

    it("states the shortfall in the same words the rest of the surface uses", () => {
      // One wording for one rule: "exactamente 100 %" is gone.
      renderPanel({ coefficients: partialSumCoefficients });

      const { fileSumUnits } = computeSharingAgreementCoefficientSums(partialSumCoefficients);
      const expected = (formatCoefficientGapMessage(COEFFICIENT_SCALE - fileSumUnits) as string).replace(/\u00A0/g, " ");
      expect(screen.getByText(expected)).toBeVisible();
      expect(screen.queryByText(/exactamente 100/)).not.toBeInTheDocument();
    });

    it("gates on a missing regulatory code with its own visible reason", () => {
      renderPanel({ plantRegulatoryCode: undefined });
      expect(screen.getByRole("button", { name: GENERATE })).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByText("Esta planta no tiene código regulatorio (CAU) asignado.")).toBeVisible();
    });

    it("opens the generate dialog when nothing blocks it", async () => {
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByRole("button", { name: GENERATE }));
      expect(await screen.findByRole("heading", { name: "Generar fichero" })).toBeInTheDocument();
    });
  });

  // AC9 — importing authors coefficients, so it lives in the split section now.
  it("offers no import action at all", () => {
    renderPanel();
    expect(screen.queryByRole("button", { name: /Importar/ })).not.toBeInTheDocument();
    expect(screen.queryByText("¿Necesitas cambiarlo?")).not.toBeInTheDocument();
  });

  describe('"Fichero importado"', () => {
    const withFile = makeAgreement({
      file: { id: "file-1", filename: "CAU0001_2026.txt", uploadedAt: "2026-01-15T10:00:00Z" },
    });

    it("shows an explicit empty state rather than nothing, when no file was imported", () => {
      renderPanel();
      expect(screen.getByText("Fichero importado")).toBeInTheDocument();
      expect(screen.getByText("No has importado ningún fichero en este acuerdo.")).toBeVisible();
      expect(screen.queryByRole("button", { name: /Descargar/ })).not.toBeInTheDocument();
    });

    it("shows the filename and the date it was imported", () => {
      renderPanel({ agreement: withFile });
      expect(screen.getByText("CAU0001_2026.txt")).toBeInTheDocument();
      expect(screen.getByText(/Importado el/)).toBeInTheDocument();
    });

    it("renders the filename without a date when uploadedAt is missing, never a fabricated one", () => {
      const noDateFile = makeAgreement({
        file: { id: "file-1", filename: "old.txt", uploadedAt: undefined as unknown as string },
      });
      renderPanel({ agreement: noDateFile });
      expect(screen.getByText("old.txt")).toBeInTheDocument();
      expect(screen.queryByText(/Importado el/)).not.toBeInTheDocument();
    });

    // AC11 — persistent, not a dismissible alert: the mismatch it warns about
    // does not go away when the notice does.
    it("warns on a DRAFT that editing the coefficients makes the imported file stale", () => {
      renderPanel({ agreement: withFile });

      const note = screen.getByText("Si editas los coeficientes, este fichero deja de coincidir con el reparto.");
      expect(note).toBeVisible();
      expect(note.closest(".MuiAlert-root")).toBeNull();
      expect(screen.queryByRole("button", { name: /Cerrar|Close/ })).not.toBeInTheDocument();
    });

    it("does not warn once the coefficients are sealed", () => {
      const published = makeAgreement({ file: withFile.file, status: SharingAgreementResponseStatus.PUBLISHED });
      renderPanel({ agreement: published });

      expect(
        screen.queryByText("Si editas los coeficientes, este fichero deja de coincidir con el reparto."),
      ).not.toBeInTheDocument();
    });

    it("calls the download function only on click, not before", async () => {
      mockDownload.mockResolvedValue({ blob: new Blob(["x"]), filename: "CAU0001_2026.txt" });
      const user = userEvent.setup();
      renderPanel({ agreement: withFile });

      expect(mockDownload).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Descargar fichero importado" }));

      await waitFor(() => expect(mockDownload).toHaveBeenCalledWith("plant-1", "agreement-1"));
    });

    it("on a download error, dispatches a toast and keeps the button clickable", async () => {
      mockDownload.mockRejectedValue({ response: { status: 500 } });
      const user = userEvent.setup();
      renderPanel({ agreement: withFile });

      await user.click(screen.getByRole("button", { name: "Descargar fichero importado" }));

      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
      expect(screen.getByRole("button", { name: "Descargar fichero importado" })).toBeInTheDocument();
    });

    it("keeps the imported block unchanged after a generation — generating stores nothing", async () => {
      const user = userEvent.setup();
      renderPanel({ agreement: withFile });

      await user.click(screen.getByRole("button", { name: GENERATE }));
      expect(await screen.findByRole("heading", { name: "Generar fichero" })).toBeInTheDocument();

      // Scoped to the panel: the generate dialog builds a filename of its own
      // from the same regulatory code, so an unscoped query matches both.
      const importedBlock = screen.getByText("Fichero importado").parentElement as HTMLElement;
      expect(within(importedBlock).getByText("CAU0001_2026.txt")).toBeInTheDocument();
      expect(within(importedBlock).getByText(/Importado el/)).toBeInTheDocument();
    });
  });
});
