import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementDetailPage } from "./SharingAgreementDetailPage";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { PlantResponse, SharingAgreementPartitionCoefficientResponse, SharingAgreementResponse } from "../../api/models";
import type { SharingAgreementDetailData } from "./useSharingAgreementDetailData";
import type { SharingAgreementMutations } from "./useSharingAgreementMutations";

const mockErrorDispatch = vi.fn();
const mockUseSharingAgreementDetailData = vi.fn();
const mockUpdateAgreement = vi.fn();
const mockDeleteAgreement = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("./useSharingAgreementDetailData", () => ({
  useSharingAgreementDetailData: (...args: unknown[]) => mockUseSharingAgreementDetailData(...args),
}));

vi.mock("./useSharingAgreementMutations", () => ({
  useSharingAgreementMutations: (): SharingAgreementMutations => ({
    createAgreement: vi.fn(),
    updateAgreement: mockUpdateAgreement,
    deleteAgreement: mockDeleteAgreement,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  }),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

function mockData(overrides: Partial<SharingAgreementDetailData> = {}) {
  mockUseSharingAgreementDetailData.mockReturnValue({ ...baseData(), ...overrides });
}

// Fixtures deliberately stay minimal — only the fields these tests actually
// exercise — and are cast rather than fully populated to every now-required
// field on the generated types, matching the pattern used elsewhere in this
// codebase for partial test fixtures.
function baseData(): SharingAgreementDetailData {
  return {
    agreement: {
      id: "agreement-1",
      name: "Reparto 2025",
      status: SharingAgreementResponseStatus.DRAFT,
      installedPowerKw: 12.5,
      notes: "Nota original",
      createdAt: "2026-01-15T10:00:00Z",
      file: null,
    } as unknown as SharingAgreementResponse,
    plant: { name: "Planta Solar Norte", regulatoryCode: "CAU-123" } as PlantResponse,
    coefficients: [],
    isLoading: false,
    isNotFound: false,
    error: null,
  };
}

function setup(plantId = "plant-1", sharingAgreementId = "agreement-1") {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[`/production/${plantId}/sharing-agreements/${sharingAgreementId}`]}>
          <Routes>
            <Route
              path="/production/:plantId/sharing-agreements/:sharingAgreementId"
              element={<SharingAgreementDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("SharingAgreementDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows the actions kebab for a DRAFT agreement", async () => {
    mockData();
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "" }));
    expect(await screen.findByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

  test("hides the actions kebab for a non-DRAFT agreement", () => {
    mockData({
      agreement: {
        id: "agreement-1",
        name: "Reparto 2025",
        status: SharingAgreementResponseStatus.PUBLISHED,
        installedPowerKw: 12.5,
      } as SharingAgreementResponse,
    });
    setup();

    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
  });

  test("editing seeds the dialog with the agreement's current values and calls updateAgreement with the route's id", async () => {
    mockData();
    mockUpdateAgreement.mockResolvedValue(true);
    const user = userEvent.setup();
    setup("plant-1", "agreement-1");

    await user.click(screen.getByRole("button", { name: "" }));
    await user.click(await screen.findByText("Editar"));

    expect(await screen.findByLabelText("Nombre", { exact: false })).toHaveValue("Reparto 2025");
    expect(screen.getByLabelText("Notas internas", { exact: false })).toHaveValue("Nota original");
    expect(screen.getByLabelText("Capacidad de generación de la planta", { exact: false })).toHaveValue("12,5");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mockUpdateAgreement).toHaveBeenCalledWith(
        "agreement-1",
        expect.objectContaining({ name: "Reparto 2025", notes: "Nota original", installedPowerKw: 12.5 }),
      ),
    );
  });

  test("warns that changing capacity shifts each supply's kW when the agreement already has coefficients", async () => {
    mockData({ coefficients: [{ coefficientId: "c1" }] as SharingAgreementPartitionCoefficientResponse[] });
    const user = userEvent.setup();
    setup("plant-1", "agreement-1");

    await user.click(screen.getByRole("button", { name: "" }));
    await user.click(await screen.findByText("Editar"));

    const capacityInput = await screen.findByLabelText("Capacidad de generación de la planta", { exact: false });
    await user.clear(capacityInput);
    await user.type(capacityInput, "20");

    expect(
      await screen.findByText(/cambiar la capacidad no modifica los coeficientes ya guardados/i),
    ).toBeInTheDocument();
  });

  test("does not warn when the agreement has no coefficients yet", async () => {
    mockData({ coefficients: [] });
    const user = userEvent.setup();
    setup("plant-1", "agreement-1");

    await user.click(screen.getByRole("button", { name: "" }));
    await user.click(await screen.findByText("Editar"));

    const capacityInput = await screen.findByLabelText("Capacidad de generación de la planta", { exact: false });
    await user.clear(capacityInput);
    await user.type(capacityInput, "20");

    expect(screen.queryByText(/cambiar la capacidad no modifica los coeficientes ya guardados/i)).not.toBeInTheDocument();
  });

  test("deleting navigates back to the list on success, removing (not invalidating) the detail query is the hook's job", async () => {
    mockData();
    mockDeleteAgreement.mockResolvedValue(true);
    const user = userEvent.setup();
    setup("plant-1", "agreement-1");

    await user.click(screen.getByRole("button", { name: "" }));
    await user.click(await screen.findByText("Eliminar"));

    expect(await screen.findByRole("heading", { name: "Eliminar acuerdo de reparto" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(mockDeleteAgreement).toHaveBeenCalledWith("agreement-1"));
    expect(mockNavigate).toHaveBeenCalledWith("/production/plant-1/sharing-agreements");
  });

  test("does not navigate away when delete fails", async () => {
    mockData();
    mockDeleteAgreement.mockResolvedValue(false);
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "" }));
    await user.click(await screen.findByText("Eliminar"));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(mockDeleteAgreement).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("renders a dedicated not-found state without dispatching a toast", () => {
    mockData({ isNotFound: true, agreement: undefined });
    setup();

    expect(screen.getByText("Acuerdo no encontrado")).toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });
});
