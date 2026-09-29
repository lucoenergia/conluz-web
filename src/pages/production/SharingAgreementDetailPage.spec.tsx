import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { SharingAgreementDetailPage } from "./SharingAgreementDetailPage";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import {
  buildCoefficient,
  buildPlant,
  buildPlantCapabilities,
  buildSharingAgreement,
  buildSharingAgreementCapabilities,
} from "../../test/fixtures";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import type { SharingAgreementDetailData } from "./useSharingAgreementDetailData";
import {
  useDeleteSharingAgreement,
  usePublishSharingAgreement,
  useRevertSharingAgreementToDraft,
  useUpdateSharingAgreement,
} from "../../api/sharing-agreements/sharing-agreements";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, DERIVED, CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;

const mockErrorDispatch = vi.fn();
const mockSuccessDispatch = vi.fn();
const mockUseSharingAgreementDetailData = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockPublishMutateAsync = vi.fn();
const mockRevertMutateAsync = vi.fn();
const mockNavigate = vi.fn();

// Spread the originals: the harness renders the real providers.
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock(import("../../context/success.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSuccessDispatch: () => mockSuccessDispatch,
}));

vi.mock(import("./useSharingAgreementDetailData"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSharingAgreementDetailData: (...args: Parameters<typeof mockUseSharingAgreementDetailData>) =>
    mockUseSharingAgreementDetailData(...args),
}));

// Only the reads are replaced; the actions layer runs for real, so what is
// under test is that each control follows the agreement's capabilities.
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdateSharingAgreement: vi.fn(),
  useDeleteSharingAgreement: vi.fn(),
  usePublishSharingAgreement: vi.fn(),
  useRevertSharingAgreementToDraft: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

// jsdom does not implement window.scrollTo, which the page calls on entry.
beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

function mockData(overrides: Partial<SharingAgreementDetailData> = {}) {
  mockUseSharingAgreementDetailData.mockReturnValue({ ...baseData(), ...overrides });
}

// Fixtures name only the fields these tests exercise; the builders supply the
// rest, including the capabilities the screen now gates on.
const MANAGEABLE = buildSharingAgreementCapabilities({ canRead: true, canManage: true });

function agreementFixture(overrides: Parameters<typeof buildSharingAgreement>[0] = {}) {
  return buildSharingAgreement({
    id: "agreement-1",
    name: "Reparto 2025",
    status: SharingAgreementResponseStatus.DRAFT,
    installedPowerKw: 12.5,
    notes: "Nota original",
    createdAt: "2026-01-15T10:00:00Z",
    capabilities: MANAGEABLE,
    ...overrides,
  });
}

function baseData(): SharingAgreementDetailData {
  return {
    agreement: agreementFixture(),
    plant: buildPlant({
      name: "Planta Solar Norte",
      regulatoryCode: "CAU-123",
      capabilities: buildPlantCapabilities({
        canRead: true,
        canListSharingAgreements: true,
        canManageSharingAgreements: true,
      }),
    }),
    coefficients: [],
    coefficientsData: [],
    isLoading: false,
    isNotFound: false,
    error: null,
  };
}

function coefficient(id: string, applicationState: "PENDING" | "APPLIED"): SharingAgreementPartitionCoefficientResponse {
  return buildCoefficient({
    coefficientId: id,
    supply: { id: `s${id}`, name: `Punto ${id}`, code: `ES00313000000000${id}AB` },
    coefficient: 0.2,
    applicationState,
    validFrom: applicationState === "APPLIED" ? "2026-01-01" : null,
    endState: OPEN,
  });
}

function setup(plantId = "plant-1", sharingAgreementId = "agreement-1") {
  renderWithProviders(
    <Routes>
      <Route
        path="/production/:plantId/sharing-agreements/:sharingAgreementId"
        element={<SharingAgreementDetailPage />}
      />
    </Routes>,
    {
      route: `/production/${plantId}/sharing-agreements/${sharingAgreementId}`,
      activeCommunityId: "TEST-COMMUNITY-ID",
    },
  );
}

describe("SharingAgreementDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUpdateSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockUpdateMutateAsync }));
    vi.mocked(useDeleteSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockDeleteMutateAsync }));
    vi.mocked(usePublishSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockPublishMutateAsync }));
    vi.mocked(useRevertSharingAgreementToDraft).mockReturnValue(mutation.idle({ mutateAsync: mockRevertMutateAsync }));
  });

  test("offers editing and deleting in the kebab for a DRAFT agreement", async () => {
    mockData();
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    expect(await screen.findByText("Editar datos del acuerdo")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

  test("keeps editing available on a non-DRAFT agreement, but not deleting", async () => {
    // `PUT /sharing-agreements/{id}` accepts any status; `DELETE` still 409s
    // outside DRAFT, since removing a published agreement would destroy the
    // historical basis of past billing.
    mockData({
      agreement: agreementFixture({ status: SharingAgreementResponseStatus.PUBLISHED, notes: null }),
    });
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    expect(await screen.findByText("Editar datos del acuerdo")).toBeInTheDocument();
    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
  });

  // SUPERSEDED is a computed invariant rather than a stored transition, so it
  // gets its own case: nothing guarantees it takes the same branch as PUBLISHED.
  test("keeps editing available on a SUPERSEDED agreement too", async () => {
    mockData({
      agreement: agreementFixture({ status: SharingAgreementResponseStatus.SUPERSEDED, notes: null }),
    });
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    expect(await screen.findByText("Editar datos del acuerdo")).toBeInTheDocument();
    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
  });

  // The next-step banner owns "Registrar fechas" while stage 5 is current, and
  // the application panel is on screen in exactly that state — the two surfaces
  // used to render the same action one above the other.
  test("offers 'Registrar fechas' once on a PUBLISHED agreement with outstanding points", () => {
    const coefficients = [
      coefficient("1", "APPLIED"),
      coefficient("2", "PENDING"),
      coefficient("3", "PENDING"),
    ];
    mockData({
      agreement: agreementFixture({ status: SharingAgreementResponseStatus.PUBLISHED, notes: null }),
      coefficients,
      coefficientsData: coefficients,
    });
    setup();

    expect(screen.getByText("1 de 3 puntos con fecha de aplicación")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Registrar fechas (2 pendientes)" })).toHaveLength(1);
  });

  test("opens scrolled to the top, whatever scroll position the previous page left", () => {
    mockData();
    setup();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  // #182 AC2, AC3: one progress reading on a sealed agreement with outstanding points.
  test.each([SharingAgreementResponseStatus.PUBLISHED, SharingAgreementResponseStatus.SUPERSEDED])(
    "shows a single application progress bar on a %s agreement with pending points",
    (status) => {
      const coefficients = [
        buildCoefficient({ coefficientId: "c1", applicationState: APPLIED, endState: OPEN, validFrom: "2026-01-01" }),
        buildCoefficient({ coefficientId: "c2", applicationState: APPLIED, endState: CLOSED, validFrom: "2025-01-01" }),
        buildCoefficient({ coefficientId: "c3", applicationState: PENDING }),
      ];
      mockData({
        agreement: buildSharingAgreement({ id: "agreement-1", status }),
        coefficients,
        coefficientsData: coefficients,
      });
      setup();

      // #182 AC4: the CLOSED row counts as applied.
      expect(screen.getByText("2 de 3 puntos con fecha de aplicación")).toBeVisible();
      const progressBars = screen.getAllByRole("progressbar");
      expect(progressBars).toHaveLength(1);
      expect(progressBars[0]).toHaveAccessibleName("Puntos con fecha de aplicación");
      expect(progressBars[0]).toHaveAttribute("aria-valuenow", String(Math.round((2 / 3) * 100)));
      expect(screen.queryByText("Suma de los coeficientes")).not.toBeInTheDocument();
      expect(screen.queryByText(/^Suma aplicada/)).not.toBeInTheDocument();
      // A pending point has no end date either, so no closing line may claim otherwise.
      expect(screen.queryByText("Todos los puntos tienen fecha de fin.")).not.toBeInTheDocument();
    },
  );

  // #182 AC5: nothing left to report once every point has a date, closed rows included.
  test.each([SharingAgreementResponseStatus.PUBLISHED, SharingAgreementResponseStatus.SUPERSEDED])(
    "hides the application section on a %s agreement whose points all have a date",
    (status) => {
      const coefficients = [
        buildCoefficient({ coefficientId: "c1", applicationState: APPLIED, endState: OPEN, validFrom: "2026-01-01" }),
        buildCoefficient({ coefficientId: "c2", applicationState: APPLIED, endState: CLOSED, validFrom: "2025-01-01" }),
        buildCoefficient({ coefficientId: "c3", applicationState: APPLIED, endState: DERIVED, validFrom: "2025-06-01" }),
      ];
      mockData({
        agreement: buildSharingAgreement({ id: "agreement-1", status }),
        coefficients,
        coefficientsData: coefficients,
      });
      setup();

      expect(screen.queryByRole("heading", { name: "Aplicación del reparto" })).not.toBeInTheDocument();
      expect(screen.queryByText(/puntos con fecha de aplicación/)).not.toBeInTheDocument();
      expect(screen.queryByText(/no reciben producción/)).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    },
  );

  // #182 AC1: a draft keeps its sum gauge and shows no application progress.
  test("shows the coefficient sum and no application progress on a DRAFT agreement", () => {
    const coefficients = [
      buildCoefficient({ coefficientId: "c1", coefficient: 0.6 }),
      buildCoefficient({ coefficientId: "c2", coefficient: 0.4 }),
    ];
    mockData({
      agreement: buildSharingAgreement({ id: "agreement-1", status: SharingAgreementResponseStatus.DRAFT }),
      coefficients,
      coefficientsData: coefficients,
    });
    setup();

    expect(screen.getByRole("progressbar", { name: "Suma de los coeficientes" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Aplicación del reparto" })).not.toBeInTheDocument();
    expect(screen.queryByText(/puntos con fecha de aplicación/)).not.toBeInTheDocument();
  });

  // The endpoint replaces all three fields, so the two the admin did not touch
  // have to travel with the one they did — on a published agreement as much as
  // on a draft, where omitting them would silently blank the record.
  test("submits all three fields on a PUBLISHED agreement even when only the name changed", async () => {
    mockData({
      agreement: agreementFixture({ status: SharingAgreementResponseStatus.PUBLISHED }),
    });
    mockUpdateMutateAsync.mockResolvedValue(undefined);
    const user = userEvent.setup();
    setup("plant-1", "agreement-1");

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    await user.click(await screen.findByText("Editar datos del acuerdo"));

    const nameInput = await screen.findByLabelText("Nombre", { exact: false });
    await user.clear(nameInput);
    await user.type(nameInput, "Reparto 2025 corregido");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        plantId: "plant-1",
        sharingAgreementId: "agreement-1",
        data: expect.objectContaining({
          name: "Reparto 2025 corregido",
          notes: "Nota original",
          installedPowerKw: 12.5,
        }),
      }),
    );
  });

  test("a successful edit refreshes the header without a full reload", async () => {
    mockData();
    mockUpdateMutateAsync.mockImplementation(async () => {
      mockData({
        agreement: agreementFixture({ name: "Reparto 2025 corregido" }),
      });
      return true;
    });
    const user = userEvent.setup();
    setup("plant-1", "agreement-1");

    expect(screen.getByRole("heading", { name: "Reparto 2025" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    await user.click(await screen.findByText("Editar datos del acuerdo"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("heading", { name: "Reparto 2025 corregido" })).toBeInTheDocument();
  });

  test("editing seeds the dialog with the agreement's current values and calls updateAgreement with the route's id", async () => {
    mockData();
    mockUpdateMutateAsync.mockResolvedValue(undefined);
    const user = userEvent.setup();
    setup("plant-1", "agreement-1");

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    await user.click(await screen.findByText("Editar datos del acuerdo"));

    expect(await screen.findByLabelText("Nombre", { exact: false })).toHaveValue("Reparto 2025");
    expect(screen.getByLabelText("Notas internas", { exact: false })).toHaveValue("Nota original");
    expect(screen.getByLabelText("Capacidad de generación de la planta", { exact: false })).toHaveValue("12,5");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        plantId: "plant-1",
        sharingAgreementId: "agreement-1",
        data: expect.objectContaining({ name: "Reparto 2025", notes: "Nota original", installedPowerKw: 12.5 }),
      }),
    );
  });

  test("warns that changing capacity shifts each supply's kW when the agreement already has coefficients", async () => {
    mockData({ coefficients: [buildCoefficient({ coefficientId: "c1" })] });
    const user = userEvent.setup();
    setup("plant-1", "agreement-1");

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    await user.click(await screen.findByText("Editar datos del acuerdo"));

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

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    await user.click(await screen.findByText("Editar datos del acuerdo"));

    const capacityInput = await screen.findByLabelText("Capacidad de generación de la planta", { exact: false });
    await user.clear(capacityInput);
    await user.type(capacityInput, "20");

    expect(screen.queryByText(/cambiar la capacidad no modifica los coeficientes ya guardados/i)).not.toBeInTheDocument();
  });

  test("deleting navigates back to the list on success, removing (not invalidating) the detail query is the hook's job", async () => {
    mockData();
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    const user = userEvent.setup();
    setup("plant-1", "agreement-1");

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    await user.click(await screen.findByText("Eliminar"));

    expect(await screen.findByRole("heading", { name: "Eliminar acuerdo de reparto" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(mockDeleteMutateAsync).toHaveBeenCalledWith({ plantId: "plant-1", sharingAgreementId: "agreement-1" }));
    expect(mockNavigate).toHaveBeenCalledWith("/production/plant-1/sharing-agreements");
  });

  test("does not navigate away when delete fails", async () => {
    mockData();
    mockDeleteMutateAsync.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    await user.click(await screen.findByText("Eliminar"));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(mockDeleteMutateAsync).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("renders a dedicated not-found state without dispatching a toast", () => {
    mockData({ isNotFound: true, agreement: undefined });
    setup();

    expect(screen.getByText("Acuerdo no encontrado")).toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  describe("a caller who may list the agreements but not manage them", () => {
    const READ_ONLY = buildSharingAgreementCapabilities({ canRead: true, canManage: false });

    it("gets no kebab on a DRAFT, so neither editing nor deleting is offered", () => {
      mockData({ agreement: agreementFixture({ capabilities: READ_ONLY }) });
      setup();

      expect(screen.queryByRole("button", { name: "Más opciones del acuerdo" })).not.toBeInTheDocument();
    });

    it("is offered no lifecycle transition on a DRAFT whose coefficients are complete", () => {
      const coefficients = [coefficient("1", "PENDING")];
      mockData({
        agreement: agreementFixture({ capabilities: READ_ONLY }),
        coefficients,
        coefficientsData: coefficients,
      });
      setup();

      expect(screen.queryByRole("button", { name: "Poner en vigor" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Editar a mano" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Importar TXT" })).not.toBeInTheDocument();
    });

    it("is offered no way back to draft on a PUBLISHED agreement whose coefficients are inert", () => {
      const coefficients = [coefficient("1", "PENDING")];
      mockData({
        agreement: agreementFixture({ status: SharingAgreementResponseStatus.PUBLISHED, capabilities: READ_ONLY }),
        coefficients,
        coefficientsData: coefficients,
      });
      setup();

      expect(screen.queryByRole("button", { name: "Volver a borrador" })).not.toBeInTheDocument();
    });

    // Capability first, then status: the same caller with canManage does get it,
    // which is what makes the three cases above about the gate and not the rule.
    it("still gets the way back to draft when the agreement says they may manage it", () => {
      const coefficients = [coefficient("1", "PENDING")];
      mockData({
        agreement: agreementFixture({ status: SharingAgreementResponseStatus.PUBLISHED }),
        coefficients,
        coefficientsData: coefficients,
      });
      setup();

      expect(screen.getByRole("button", { name: "Volver a borrador" })).toBeInTheDocument();
    });
  });
});
