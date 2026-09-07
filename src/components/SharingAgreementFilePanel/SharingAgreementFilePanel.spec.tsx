import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
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

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("./downloadSharingAgreementFile", async () => {
  const actual = await vi.importActual<typeof import("./downloadSharingAgreementFile")>("./downloadSharingAgreementFile");
  return {
    ...actual,
    downloadSharingAgreementFile: (...args: unknown[]) => mockDownload(...args),
  };
});

vi.mock("../../api/sharing-agreements/sharing-agreements", async () => {
  const actual = await vi.importActual<typeof import("../../api/sharing-agreements/sharing-agreements")>(
    "../../api/sharing-agreements/sharing-agreements",
  );
  return {
    ...actual,
    useUploadSharingAgreementFile: () => ({
      mutateAsync: mockUploadMutateAsync,
      isPending: false,
      reset: vi.fn(),
    }),
    useGenerateSharingAgreementDistributorFile: () => ({
      mutateAsync: mockGenerateMutateAsync,
      isPending: false,
      reset: vi.fn(),
    }),
  };
});

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
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SharingAgreementFilePanel
          plantId="plant-1"
          sharingAgreementId="agreement-1"
          agreement={agreement}
          coefficients={coefficients}
          plantRegulatoryCode={plantRegulatoryCode}
        />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("SharingAgreementFilePanel", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockDownload.mockClear();
    mockUploadMutateAsync.mockClear();
    mockGenerateMutateAsync.mockClear();
  });

  describe("state A — no file, DRAFT", () => {
    it("shows the empty-state copy and both Generar/Importar actions, never probing the download endpoint", () => {
      renderPanel();
      expect(screen.getByText("Todavía no hay ningún fichero guardado.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Generar fichero" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Importar un fichero que ya tengas" })).toBeInTheDocument();
      expect(mockDownload).not.toHaveBeenCalled();
    });

    it("shows the section title and description tailored to DRAFT", () => {
      renderPanel();
      expect(screen.getByText("Fichero para la distribuidora")).toBeInTheDocument();
      expect(screen.getByText(/Genéralo aquí desde los coeficientes, o impórtalo/)).toBeInTheDocument();
    });

    it("disables Generar with a visible (non-tooltip) reason when the coefficient sum isn't 100%", () => {
      renderPanel({ coefficients: partialSumCoefficients });
      const button = screen.getByRole("button", { name: "Generar fichero" });
      expect(button).toBeDisabled();
      expect(
        screen.getByText("La suma de los coeficientes debe ser exactamente 100 % para generar el fichero."),
      ).toBeInTheDocument();
    });

    it("disables Generar with a visible reason when the plant has no regulatory code", () => {
      renderPanel({ plantRegulatoryCode: undefined });
      expect(screen.getByRole("button", { name: "Generar fichero" })).toBeDisabled();
      expect(screen.getByText("Esta planta no tiene código regulatorio (CAU) asignado.")).toBeInTheDocument();
    });

    it("opens the generate dialog when Generar is enabled", async () => {
      const user = userEvent.setup();
      renderPanel();
      await user.click(screen.getByRole("button", { name: "Generar fichero" }));
      expect(await screen.findByRole("heading", { name: "Generar fichero" })).toBeInTheDocument();
    });
  });

  describe("state B — file present", () => {
    const withFile = makeAgreement({
      file: { id: "file-1", filename: "CAU0001_2026.txt", uploadedAt: "2026-01-15T10:00:00Z" },
    });

    it("shows the filename, upload date, and Descargar as the primary action", () => {
      renderPanel({ agreement: withFile });
      expect(screen.getByText("CAU0001_2026.txt")).toBeInTheDocument();
      expect(screen.getByText(/Subido el/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Descargar fichero" })).toBeInTheDocument();
    });

    it("renders the filename without a date when uploadedAt is missing, never an empty slot or fabricated date", () => {
      const noDateFile = makeAgreement({ file: { id: "file-1", filename: "old.txt", uploadedAt: undefined as unknown as string } });
      renderPanel({ agreement: noDateFile });
      expect(screen.getByText("old.txt")).toBeInTheDocument();
      expect(screen.queryByText(/Subido el/)).not.toBeInTheDocument();
      expect(screen.queryByText("-")).not.toBeInTheDocument();
    });

    it("shows subordinate Generar/Importar actions only for a DRAFT agreement", () => {
      renderPanel({ agreement: withFile });
      expect(screen.getByText("¿Necesitas cambiarlo?")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Generar fichero" })).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Importar otro fichero" })).toBeInTheDocument();
    });

    it("does not show subordinate actions for a non-DRAFT agreement", () => {
      const published = makeAgreement({ file: withFile.file, status: SharingAgreementResponseStatus.PUBLISHED });
      renderPanel({ agreement: published });
      expect(screen.queryByText("¿Necesitas cambiarlo?")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Generar fichero" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Importar otro fichero" })).not.toBeInTheDocument();
    });

    it("shows the sealed title once published", () => {
      const published = makeAgreement({ file: withFile.file, status: SharingAgreementResponseStatus.PUBLISHED });
      renderPanel({ agreement: published });
      expect(screen.getByText("Fichero enviado a la distribuidora")).toBeInTheDocument();
    });

    it("calls the download function only on click, not before", async () => {
      mockDownload.mockResolvedValue({ blob: new Blob(["x"]), filename: "CAU0001_2026.txt" });
      const user = userEvent.setup();
      renderPanel({ agreement: withFile });

      expect(mockDownload).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Descargar fichero" }));

      await waitFor(() => expect(mockDownload).toHaveBeenCalledWith("plant-1", "agreement-1"));
    });

    it("on a download error, dispatches a toast and keeps the button clickable", async () => {
      mockDownload.mockRejectedValue({ response: { status: 500 } });
      const user = userEvent.setup();
      renderPanel({ agreement: withFile });

      await user.click(screen.getByRole("button", { name: "Descargar fichero" }));

      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
      expect(screen.getByRole("button", { name: "Descargar fichero" })).toBeInTheDocument();
    });
  });

  describe("state C — no file, non-DRAFT (sealed)", () => {
    it("renders an explained-and-closed empty state with no action button", () => {
      const sealed = makeAgreement({ status: SharingAgreementResponseStatus.PUBLISHED, file: null });
      renderPanel({ agreement: sealed });

      expect(screen.getByText(/Este acuerdo no tiene fichero/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Generar fichero" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Importar/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Descargar fichero" })).not.toBeInTheDocument();
    });
  });
});
