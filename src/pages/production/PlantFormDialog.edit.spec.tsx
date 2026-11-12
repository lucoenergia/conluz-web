import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { apiError } from "../../test/apiError";
import { mutation, query } from "../../test/queryState";
import {
  buildPlant,
  buildPlantCapabilities,
  buildSupply,
  buildSupplyCapabilities,
  buildSupplyReference,
} from "../../test/fixtures";
import type { PlantResponse } from "../../api/models";
import type { PlantInActiveCommunity } from "./usePlantInActiveCommunity";

// Reads stubbed, the mutation left real: the gate under test lives inside
// usePlantActions.
vi.mock(import("./usePlantInActiveCommunity"), async (importOriginal) => ({
  ...(await importOriginal()),
  usePlantInActiveCommunity: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdatePlant: vi.fn(),
}));

const mockErrorDispatch = vi.fn();
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";
import { getAllSupplies, useGetAllSupplies } from "../../api/supplies/supplies";
import { useUpdatePlant } from "../../api/plants/plants";
import { PlantFormDialog } from "./PlantFormDialog";

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-1";
const DIALOG = "Editar planta";
const GENERIC = "Ha habido un problema al editar la planta. Por favor, inténtalo más tarde";
const mockMutateAsync = vi.fn();
const onClose = vi.fn();

const thePlant = (canManage: boolean, overrides: Partial<PlantResponse> = {}) =>
  buildPlant({
    id: PLANT_ID,
    name: "Planta Norte",
    providerCode: "NE=1",
    regulatoryCode: "CAU-1",
    address: "Calle Sol 1",
    description: null,
    peakPowerKWp: 63,
    nominalPowerKW: 50,
    connectionDate: null,
    supply: buildSupplyReference({ id: "supply-1", code: "ES0001" }),
    community: { id: COMMUNITY_ID },
    capabilities: buildPlantCapabilities({ canRead: true, canManage }),
    ...overrides,
  });

const loaded = (plant: PlantResponse): PlantInActiveCommunity => ({
  plant,
  isLoading: false,
  isNotFound: false,
  error: null,
  refetch: vi.fn(),
});

function setup(options: { canManage?: boolean; read?: PlantInActiveCommunity } = {}) {
  const { canManage = true, read = loaded(thePlant(canManage)) } = options;

  vi.mocked(usePlantInActiveCommunity).mockReturnValue(read);
  vi.mocked(useGetAllSupplies).mockReturnValue(
    query.success<typeof getAllSupplies>({
      items: [
        buildSupply({
          id: "supply-1",
          code: "ES0001",
          name: "Casa Norte",
          community: { id: COMMUNITY_ID, name: "Sol Común" },
          capabilities: buildSupplyCapabilities({ canRead: true, canCreatePlant: false }),
        }),
        buildSupply({
          id: "supply-2",
          code: "ES0002",
          name: null,
          community: { id: COMMUNITY_ID, name: "Sol Común" },
          capabilities: buildSupplyCapabilities({ canRead: true, canCreatePlant: true }),
        }),
      ],
      size: 10000,
      totalElements: 2,
      totalPages: 1,
      number: 0,
    }),
  );
  vi.mocked(useUpdatePlant).mockReturnValue(mutation.idle({ mutateAsync: mockMutateAsync }));

  return renderWithProviders(<PlantFormDialog target={{ kind: "edit", plantId: PLANT_ID }} onClose={onClose} />, {
    activeCommunityId: COMMUNITY_ID,
  });
}

const saveButton = () => screen.getByRole("button", { name: "Guardar" });

beforeEach(() => {
  vi.clearAllMocks();
  mockMutateAsync.mockResolvedValue(thePlant(true));
});

/**
 * The plant form in edit mode (#373): what it loads, what it sends, where a
 * refusal lands. Where it opens from and its overlay behaviour over the list
 * are PlantsPage.plantForm.spec.tsx's.
 */
describe("PlantFormDialog: editing", () => {
  it("UI-OVL-006 is a dialog named by its title", () => {
    setup();

    expect(screen.getByRole("dialog", { name: DIALOG })).toBeInTheDocument();
  });

  it("UI-PLS-004 opens with the plant's own values", () => {
    setup();

    expect(screen.getByLabelText(/Código de proveedor/)).toHaveValue("NE=1");
    expect(screen.getByLabelText(/CAU/)).toHaveValue("CAU-1");
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Planta Norte");
    expect(screen.getByLabelText(/Dirección/)).toHaveValue("Calle Sol 1");
    expect(screen.getByLabelText(/Potencia pico/)).toHaveValue(63);
    expect(screen.getByLabelText(/Potencia nominal/)).toHaveValue(50);
  });

  it("saves through the action when the plant permits managing it, and closes", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(saveButton());

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        plantId: PLANT_ID,
        data: expect.objectContaining({
          providerCode: "NE=1",
          regulatoryCode: "CAU-1",
          name: "Planta Norte",
          address: "Calle Sol 1",
          peakPowerKWp: 63,
          nominalPowerKW: 50,
          supplyCode: "ES0001",
          inverterProvider: "HUAWEI",
        }),
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("sends no description rather than an empty one", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(saveButton());

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    expect(mockMutateAsync.mock.calls[0][0].data.description).toBeUndefined();
  });

  it("offers no way to submit when the plant does not permit managing it", async () => {
    const user = userEvent.setup();
    setup({ canManage: false });

    expect(saveButton()).toBeDisabled();
    await user.click(saveButton());
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("UI-PLS-008 reads Guardar, whatever the plant's name", () => {
    setup({ read: loaded(thePlant(true, { name: "Crear planta" })) });

    expect(saveButton()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Crear planta|Guardar cambios/ })).not.toBeInTheDocument();
  });

  it("keeps the plant's own supply, disabled, even though the caller may not start a plant on it", () => {
    setup();

    const supply = screen.getByRole("combobox", { name: /Punto de suministro/ });
    expect(supply).toHaveValue("Casa Norte (ES0001)");
    expect(supply).toBeDisabled();
  });

  describe("UI-PLS-004 while the plant cannot be shown", () => {
    it("UI-PLS-004 shows a spinner, labelled, and no fields while it loads", () => {
      setup({
        read: { plant: undefined, isLoading: true, isNotFound: false, error: null, refetch: vi.fn() },
      });

      expect(screen.getByRole("progressbar", { name: "Cargando..." })).toBeInTheDocument();
      expect(screen.queryByLabelText(/Código de proveedor/)).not.toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("UI-PLS-004 shows the plant detail page's not-found state, and no fields, for a missing or foreign plant", () => {
      setup({
        read: { plant: undefined, isLoading: false, isNotFound: true, error: null, refetch: vi.fn() },
      });

      expect(screen.getByText("Planta no encontrada")).toBeInTheDocument();
      expect(screen.getByText("Esta planta no existe o no tienes acceso a su comunidad.")).toBeInTheDocument();
      expect(screen.queryByLabelText(/Código de proveedor/)).not.toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("UI-PLS-004 says a failed read failed, and reads it again on Reintentar", async () => {
      const refetch = vi.fn();
      const user = userEvent.setup();
      setup({ read: { plant: undefined, isLoading: false, isNotFound: false, error: new Error("boom"), refetch } });

      expect(
        screen.getByText("Ha habido un problema al cargar la información de esta planta. Por favor, inténtalo más tarde"),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Reintentar" }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("a refusal", () => {
    it("UI-ERR-005 a 409 SUPPLY_ALREADY_HAS_PLANT shows the catalogue's text, and the form stays as typed", async () => {
      mockMutateAsync.mockRejectedValue(apiError(409, { code: "SUPPLY_ALREADY_HAS_PLANT" }));
      const user = userEvent.setup();
      setup();

      await user.clear(screen.getByLabelText(/^Nombre/));
      await user.type(screen.getByLabelText(/^Nombre/), "Planta Este");
      await user.click(saveButton());

      await waitFor(() =>
        expect(mockErrorDispatch).toHaveBeenCalledWith("Este punto de suministro ya pertenece a otra planta."),
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: DIALOG })).toBeInTheDocument();
      expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Planta Este");
    });

    it("UI-ERR-005 shows the server's message for a refusal whose code the catalogue does not map", async () => {
      mockMutateAsync.mockRejectedValue(apiError(400, { code: null }));
      const user = userEvent.setup();
      setup();

      await user.click(saveButton());

      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith("raw backend message"));
    });

    it("keeps the generic message for a failure without an error detail (#253)", async () => {
      mockMutateAsync.mockRejectedValue(apiError(500));
      const user = userEvent.setup();
      setup();

      await user.click(saveButton());

      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(GENERIC));
    });
  });

  describe("UI-PLS-006 while the save is in flight", () => {
    const holdSave = () => {
      let settle: () => void = () => {};
      mockMutateAsync.mockImplementation(
        () => new Promise((resolve) => (settle = () => resolve(thePlant(true)))),
      );
      return () => settle();
    };

    it("UI-PLS-006 sends one request however often it is submitted, and reads Guardando...", async () => {
      const settle = holdSave();
      const user = userEvent.setup();
      setup();

      const form = screen.getByRole("dialog", { name: DIALOG }).querySelector("form") ?? saveButton().closest("form")!;
      await user.click(saveButton());
      // The button is disabled now; a submit by Enter or a second dispatch is what is left.
      fireEvent.submit(form);
      fireEvent.submit(form);

      expect(screen.getByRole("button", { name: "Guardando..." })).toBeDisabled();
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);

      await act(async () => settle());
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    it("UI-PLS-006 makes every text input read-only, and Cancelar disabled", async () => {
      holdSave();
      const user = userEvent.setup();
      setup();

      await user.click(saveButton());

      for (const label of [/Código de proveedor/, /CAU/, /^Nombre/, /Dirección/, /Descripción/, /Potencia pico/, /Potencia nominal/]) {
        expect(screen.getByLabelText(label)).toHaveAttribute("readonly");
      }
      expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    });
  });
});
