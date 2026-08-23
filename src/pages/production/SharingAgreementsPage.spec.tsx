import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { SharingAgreementsPage } from "./SharingAgreementsPage";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";
import type { SharingAgreementsData } from "./useSharingAgreementsData";
import type { SharingAgreementMutations } from "./useSharingAgreementMutations";

const mockErrorDispatch = vi.fn();
const mockUseSharingAgreementsData = vi.fn();
const mockCreateAgreement = vi.fn();
const mockUpdateAgreement = vi.fn();
const mockDeleteAgreement = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("./useSharingAgreementsData", () => ({
  useSharingAgreementsData: (...args: unknown[]) => mockUseSharingAgreementsData(...args),
}));

vi.mock("./useSharingAgreementMutations", () => ({
  useSharingAgreementMutations: (): SharingAgreementMutations => ({
    createAgreement: mockCreateAgreement,
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

const AGREEMENTS: SharingAgreementResponse[] = [
  { id: "1", name: "Reparto vecinos bloque A", status: SharingAgreementResponseStatus.PUBLISHED },
  { id: "2", name: "Borrador reciente", status: SharingAgreementResponseStatus.DRAFT, installedPowerKw: 5 },
  { id: "3", name: "Acuerdo histórico norte", status: SharingAgreementResponseStatus.SUPERSEDED },
];

function mockData(overrides: Partial<SharingAgreementsData> = {}) {
  mockUseSharingAgreementsData.mockReturnValue({ ...baseData(), ...overrides });
}

function baseData(): SharingAgreementsData {
  return {
    agreements: AGREEMENTS,
    plant: { name: "Planta Solar Norte", regulatoryCode: "CAU-123" },
    counts: { vigentes: 5, drafts: 1, historicos: 2 },
    isLoading: false,
    isNotFound: false,
    error: null,
  };
}

function setup(plantId = "plant-1") {
  render(
    <MemoryRouter initialEntries={[`/production/${plantId}/sharing-agreements`]}>
      <Routes>
        <Route path="/production/:plantId/sharing-agreements" element={<SharingAgreementsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SharingAgreementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders plant name, CAU, counts and every agreement card on normal load", () => {
    mockData();
    setup("plant-42");

    expect(screen.getByRole("heading", { name: "Planta Solar Norte" })).toBeInTheDocument();
    expect(screen.getByText("CAU: CAU-123")).toBeInTheDocument();
    expect(screen.getByText("Reparto vecinos bloque A")).toBeInTheDocument();
    expect(screen.getByText("Borrador reciente")).toBeInTheDocument();
    expect(screen.getByText("Acuerdo histórico norte")).toBeInTheDocument();

    const planLink = screen.getByText("Planta").closest("a");
    expect(planLink).toHaveAttribute("href", "/production/plant-42");
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  test("renders a dedicated not-found state instead of the header, without dispatching a toast", () => {
    mockData({ isNotFound: true, agreements: [], plant: undefined });
    setup();

    expect(screen.getByText("Planta no encontrada")).toBeInTheDocument();
    expect(screen.queryByText("Reparto vecinos bloque A")).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  test("dispatches the generic error toast for a non-404 error", () => {
    mockData({ error: { response: { status: 500 } } });
    setup();

    expect(mockErrorDispatch).toHaveBeenCalledWith(
      "Ha habido un problema al cargar los acuerdos de reparto. Por favor, inténtalo más tarde",
    );
  });

  test("shows a distinct empty state when the plant has no agreements at all", () => {
    mockData({ agreements: [], counts: { vigentes: 0, drafts: 0, historicos: 0 } });
    setup();

    expect(screen.getByText("Esta planta todavía no tiene acuerdos de reparto registrados.")).toBeInTheDocument();
  });

  test("clicking a status chip filters the cards client-side without changing the header counts", async () => {
    mockData();
    setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Borrador" }));

    expect(screen.getByText("Borrador reciente")).toBeInTheDocument();
    expect(screen.queryByText("Reparto vecinos bloque A")).not.toBeInTheDocument();
    expect(screen.queryByText("Acuerdo histórico norte")).not.toBeInTheDocument();
    // Header counts stay derived from the unfiltered response.
    expect(mockUseSharingAgreementsData).toHaveBeenCalled();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("search filters cards by name, case- and accent-insensitively", async () => {
    mockData();
    setup();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Buscar por nombre o notas..."), "historico");

    await waitFor(() => {
      expect(screen.getByText("Acuerdo histórico norte")).toBeInTheDocument();
      expect(screen.queryByText("Reparto vecinos bloque A")).not.toBeInTheDocument();
    });
  });

  test("shows the loading skeleton while data is loading", () => {
    mockData({ isLoading: true });
    setup();

    expect(screen.queryByText("Reparto vecinos bloque A")).not.toBeInTheDocument();
  });

  test("create dialog prefills capacity from the plant's totalPower and navigates to the new agreement on submit", async () => {
    mockData({ plant: { name: "Planta Solar Norte", regulatoryCode: "CAU-123", totalPower: 30 } });
    mockCreateAgreement.mockResolvedValue({ id: "new-agreement", name: "Reparto nuevo" });
    const user = userEvent.setup();
    setup("plant-42");

    await user.click(screen.getByRole("button", { name: "Nuevo acuerdo de reparto" }));
    expect(await screen.findByLabelText("Capacidad de generación de la planta", { exact: false })).toHaveValue("30");

    await user.type(screen.getByLabelText("Nombre", { exact: false }), "Reparto nuevo");
    await user.click(screen.getByRole("button", { name: "Crear borrador" }));

    await waitFor(() => expect(mockCreateAgreement).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith("/production/plant-42/sharing-agreements/new-agreement");
  });

  test("does not navigate to a route with a missing id when create succeeds without an id", async () => {
    mockData();
    mockCreateAgreement.mockResolvedValue({ name: "Reparto nuevo" });
    const user = userEvent.setup();
    setup("plant-42");

    await user.click(screen.getByRole("button", { name: "Nuevo acuerdo de reparto" }));
    await user.type(screen.getByLabelText("Nombre", { exact: false }), "Reparto nuevo");
    await user.type(screen.getByLabelText("Capacidad de generación de la planta", { exact: false }), "10");
    await user.click(screen.getByRole("button", { name: "Crear borrador" }));

    await waitFor(() => expect(mockCreateAgreement).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Nuevo acuerdo de reparto" })).not.toBeInTheDocument());
  });

  test("editing from the card kebab seeds the dialog and calls updateAgreement with the agreement's id", async () => {
    mockData();
    mockUpdateAgreement.mockResolvedValue(true);
    const user = userEvent.setup();
    setup();

    const kebabButtons = screen.getAllByRole("button").filter((button) => button.textContent === "");
    await user.click(kebabButtons[1]); // "Borrador reciente" is the DRAFT agreement
    await user.click(await screen.findByText("Editar"));

    expect(await screen.findByLabelText("Nombre", { exact: false })).toHaveValue("Borrador reciente");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mockUpdateAgreement).toHaveBeenCalledWith("2", expect.objectContaining({ name: "Borrador reciente" })),
    );
  });

  test("deleting from the card kebab shows the confirmation and calls deleteAgreement with the agreement's id", async () => {
    mockData();
    mockDeleteAgreement.mockResolvedValue(true);
    const user = userEvent.setup();
    setup();

    const kebabButtons = screen.getAllByRole("button").filter((button) => button.textContent === "");
    await user.click(kebabButtons[1]);
    await user.click(await screen.findByText("Eliminar"));

    expect(await screen.findByRole("heading", { name: "Eliminar acuerdo de reparto" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(mockDeleteAgreement).toHaveBeenCalledWith("2"));
  });
});
