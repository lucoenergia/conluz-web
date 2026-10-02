import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { SharingAgreementsPage } from "./SharingAgreementsPage";
import { SharingAgreementResponseStatus } from "../../api/models";
import { buildPlant, buildPlantCapabilities, buildSharingAgreement, buildSharingAgreementCapabilities } from "../../test/fixtures";
import type { SharingAgreementsData } from "./useSharingAgreementsData";
import {
  useCreateSharingAgreement,
  useDeleteSharingAgreement,
} from "../../api/sharing-agreements/sharing-agreements";

const mockErrorDispatch = vi.fn();
const mockUseSharingAgreementsData = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockNavigate = vi.fn();

// Spread the original: the harness renders the real ErrorProvider.
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock(import("./useSharingAgreementsData"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSharingAgreementsData: (...args: Parameters<typeof mockUseSharingAgreementsData>) =>
    mockUseSharingAgreementsData(...args),
}));

// Only the reads are replaced. The actions layer runs for real -- which is the
// point: what is under test is that the page's button and each card's menu
// follow the capabilities on the payload, and stubbing the action hooks would
// restate that rule instead of exercising it.
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateSharingAgreement: vi.fn(),
  useDeleteSharingAgreement: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

const MANAGEABLE = buildSharingAgreementCapabilities({ canRead: true, canManage: true });

const AGREEMENTS = [
  buildSharingAgreement({
    id: "1",
    name: "Reparto vecinos bloque A",
    status: SharingAgreementResponseStatus.PUBLISHED,
    capabilities: MANAGEABLE,
  }),
  buildSharingAgreement({
    id: "2",
    name: "Borrador reciente",
    status: SharingAgreementResponseStatus.DRAFT,
    installedPowerKw: 5,
    capabilities: MANAGEABLE,
  }),
  buildSharingAgreement({
    id: "3",
    name: "Acuerdo histórico norte",
    status: SharingAgreementResponseStatus.SUPERSEDED,
    capabilities: MANAGEABLE,
  }),
];

const MANAGING_PLANT = buildPlantCapabilities({
  canRead: true,
  canListSharingAgreements: true,
  canManageSharingAgreements: true,
});

function mockData(overrides: Partial<SharingAgreementsData> = {}) {
  mockUseSharingAgreementsData.mockReturnValue({ ...baseData(), ...overrides });
}

function baseData(): SharingAgreementsData {
  return {
    agreements: AGREEMENTS,
    plant: buildPlant({ name: "Planta Solar Norte", regulatoryCode: "CAU-123", capabilities: MANAGING_PLANT }),
    counts: { vigentes: 5, drafts: 1, historicos: 2 },
    isLoading: false,
    isNotFound: false,
    error: null,
  };
}

function setup(plantId = "plant-1") {
  renderWithProviders(
    <Routes>
      <Route path="/production/:plantId/sharing-agreements" element={<SharingAgreementsPage />} />
    </Routes>,
    { route: `/production/${plantId}/sharing-agreements`, activeCommunityId: "TEST-COMMUNITY-ID" },
  );
}

describe("SharingAgreementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockCreateMutateAsync }));
    vi.mocked(useDeleteSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockDeleteMutateAsync }));
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
    mockData({
      plant: buildPlant({
        name: "Planta Solar Norte",
        regulatoryCode: "CAU-123",
        totalPower: 30,
        capabilities: MANAGING_PLANT,
      }),
    });
    mockCreateMutateAsync.mockResolvedValue({ id: "new-agreement", name: "Reparto nuevo" });
    const user = userEvent.setup();
    setup("plant-42");

    await user.click(screen.getByRole("button", { name: "Nuevo acuerdo de reparto" }));
    expect(await screen.findByLabelText("Capacidad de generación de la planta", { exact: false })).toHaveValue("30");

    await user.type(screen.getByLabelText("Nombre del acuerdo", { exact: false }), "Reparto nuevo");
    await user.click(screen.getByRole("button", { name: "Crear borrador" }));

    await waitFor(() => expect(mockCreateMutateAsync).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith("/production/plant-42/sharing-agreements/new-agreement");
  });

  test("does not navigate to a route with a missing id when create succeeds without an id", async () => {
    mockData();
    mockCreateMutateAsync.mockResolvedValue({ name: "Reparto nuevo" });
    const user = userEvent.setup();
    setup("plant-42");

    await user.click(screen.getByRole("button", { name: "Nuevo acuerdo de reparto" }));
    await user.type(screen.getByLabelText("Nombre del acuerdo", { exact: false }), "Reparto nuevo");
    await user.type(screen.getByLabelText("Capacidad de generación de la planta", { exact: false }), "10");
    await user.click(screen.getByRole("button", { name: "Crear borrador" }));

    await waitFor(() => expect(mockCreateMutateAsync).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("heading", { name: /^Nuevo acuerdo de reparto (en|de) / })).not.toBeInTheDocument());
  });

  test("renders each agreement's title as a link to its detail page", () => {
    mockData();
    setup("plant-42");

    const link = screen.getByRole("link", { name: "Borrador reciente" });
    expect(link).toHaveAttribute("href", "/production/plant-42/sharing-agreements/2");
  });

  test("only the DRAFT agreement's card renders a kebab, and it only offers Eliminar", async () => {
    mockData();
    const user = userEvent.setup();
    setup();

    const kebabButtons = screen.getAllByRole("button").filter((button) => button.textContent === "");
    expect(kebabButtons).toHaveLength(1); // only "Borrador reciente" is DRAFT

    await user.click(kebabButtons[0]);
    expect(await screen.findByText("Eliminar")).toBeInTheDocument();
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver detalle")).not.toBeInTheDocument();
  });

  test("deleting from the card kebab shows the confirmation and deletes the agreement it was opened on", async () => {
    mockData();
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    const user = userEvent.setup();
    setup();

    const kebabButtons = screen.getAllByRole("button").filter((button) => button.textContent === "");
    await user.click(kebabButtons[0]); // the only kebab is on "Borrador reciente", the DRAFT agreement
    await user.click(await screen.findByText("Eliminar"));

    expect(await screen.findByRole("heading", { name: /^Eliminar acuerdo de reparto (en|de) / })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith({ plantId: "plant-1", sharingAgreementId: "2" }),
    );
  });

  describe("a member who may list the agreements but not manage them", () => {
    const READ_ONLY_PLANT = buildPlantCapabilities({ canRead: true, canListSharingAgreements: true });
    const READ_ONLY_AGREEMENTS = AGREEMENTS.map((agreement) =>
      buildSharingAgreement({ ...agreement, capabilities: buildSharingAgreementCapabilities({ canRead: true }) }),
    );

    test("is not offered a way to create one", () => {
      mockData({
        plant: buildPlant({ name: "Planta Solar Norte", capabilities: READ_ONLY_PLANT }),
        agreements: READ_ONLY_AGREEMENTS,
      });
      setup();

      expect(screen.queryByRole("button", { name: "Nuevo acuerdo de reparto" })).not.toBeInTheDocument();
    });

    test("gets no kebab on the DRAFT card, which still opens as a link", () => {
      mockData({
        plant: buildPlant({ name: "Planta Solar Norte", capabilities: READ_ONLY_PLANT }),
        agreements: READ_ONLY_AGREEMENTS,
      });
      setup("plant-42");

      expect(screen.getAllByRole("button").filter((button) => button.textContent === "")).toHaveLength(0);
      expect(screen.getByRole("link", { name: "Borrador reciente" })).toHaveAttribute(
        "href",
        "/production/plant-42/sharing-agreements/2",
      );
    });
  });

  test("offers nothing while the plant has not arrived -- not yet known is not 'no'", () => {
    mockData({ plant: undefined, isLoading: true });
    setup();

    expect(screen.queryByRole("button", { name: "Nuevo acuerdo de reparto" })).not.toBeInTheDocument();
  });
});
