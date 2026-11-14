import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { stubViewport } from "../../test/overlay";
import { apiError } from "../../test/apiError";
import { mutation, query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildPlant,
  buildSupply,
  buildSupplyCapabilities,
} from "../../test/fixtures";

// Reads stubbed, the mutation left real: the gate under test lives inside
// useCommunityActions, so replacing the action hook would restate it.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreatePlant: vi.fn(),
}));

const mockErrorDispatch = vi.fn();
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { getAllSupplies, useGetAllSupplies } from "../../api/supplies/supplies";
import { useCreatePlant } from "../../api/plants/plants";
import { PlantFormDialog } from "./PlantFormDialog";

const COMMUNITY_ID = "community-a";
// The community's name is plantCommunityConfirmations.spec.tsx's; here it has not loaded.
const DIALOG = "Crear planta en la comunidad activa";
const GENERIC = "Ha habido un problema al crear una nueva planta. Por favor, inténtalo más tarde";
const mockMutateAsync = vi.fn();
const onClose = vi.fn();

const supply = (id: string, code: string, name: string, canCreatePlant: boolean) =>
  buildSupply({
    id,
    code,
    name,
    community: { id: COMMUNITY_ID, name: "Sol Común" },
    capabilities: buildSupplyCapabilities({ canRead: true, canCreatePlant }),
  });

function setup(canCreatePlants = true) {
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: COMMUNITY_ID,
        name: "Sol Común",
        capabilities: buildCommunityCapabilities({ canRead: true, canCreatePlants }),
      }),
    ),
  );
  const supplies = [
    supply("supply-1", "ES0001", "Casa Norte", true),
    supply("supply-2", "ES0002", "Casa Sur", false),
    supply("supply-3", "ES0003", "Casa Este", true),
  ];
  vi.mocked(useGetAllSupplies).mockReturnValue(
    query.success<typeof getAllSupplies>({
      items: supplies,
      size: 10000,
      totalElements: supplies.length,
      totalPages: 1,
      number: 0,
    }),
  );
  vi.mocked(useCreatePlant).mockReturnValue(mutation.idle({ mutateAsync: mockMutateAsync }));

  return renderWithProviders(<PlantFormDialog target={{ kind: "create" }} onClose={onClose} />, {
    activeCommunityId: COMMUNITY_ID,
  });
}

const submit = () => screen.getByRole("button", { name: "Crear planta" });
const supplyInput = () => screen.getByRole("combobox", { name: /Punto de suministro/ });

async function chooseSupply(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(supplyInput());
  await user.click(await screen.findByRole("option", { name }));
}

/** Fills every required input with a value the backend accepts. */
async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Código de proveedor/), "NE=9");
  await user.type(screen.getByLabelText(/^Nombre/), "Planta Oeste");
  await chooseSupply(user, /ES0003/);
  await user.type(screen.getByLabelText(/Dirección/), "Calle Luna 3");
  await user.type(screen.getByLabelText(/Potencia pico/), "12.5");
  await user.type(screen.getByLabelText(/Potencia nominal/), "10");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMutateAsync.mockResolvedValue(buildPlant());
});

/**
 * The plant form in create mode (#373): what it offers, what it sends, and
 * what it says about input it will not send.
 */
describe("PlantFormDialog: creating", () => {
  it("UI-OVL-006 is a dialog named by its title", () => {
    setup();

    expect(screen.getByRole("dialog", { name: DIALOG })).toBeInTheDocument();
  });

  it("UI-PLS-008 reads Crear planta", () => {
    setup();

    expect(submit()).toBeInTheDocument();
  });

  it("offers only the supplies the caller may build a plant on", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(supplyInput());

    expect(await screen.findByRole("option", { name: /ES0001/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /ES0003/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /ES0002/ })).not.toBeInTheDocument();
  });

  it("creates the plant through the action with what was typed, and closes", async () => {
    const user = userEvent.setup();
    setup();

    await fillValid(user);
    await user.click(submit());

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        data: {
          providerCode: "NE=9",
          regulatoryCode: undefined,
          name: "Planta Oeste",
          address: "Calle Luna 3",
          description: undefined,
          peakPowerKWp: 12.5,
          nominalPowerKW: 10,
          connectionDate: undefined,
          supplyCode: "ES0003",
          inverterProvider: "HUAWEI",
        },
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("offers no way to submit when the community does not permit creating plants", async () => {
    const user = userEvent.setup();
    setup(false);

    expect(submit()).toBeDisabled();
    await user.click(submit());
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  describe("UI-PLS-005 an invalid submit", () => {
    it("UI-PLS-005 with every required input empty sends nothing, says why on each, and focuses the first", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(submit());

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(screen.getByText("El código de proveedor es obligatorio")).toBeInTheDocument();
      expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
      expect(screen.getByText("El punto de suministro es obligatorio")).toBeInTheDocument();
      expect(screen.getByText("La dirección es obligatoria")).toBeInTheDocument();
      expect(screen.getByLabelText(/Potencia pico/)).toHaveAccessibleDescription("Por favor, introduce un número mayor que 0");
      expect(screen.getByLabelText(/Potencia nominal/)).toHaveAccessibleDescription("Por favor, introduce un número mayor que 0");
      expect(screen.getByLabelText(/Código de proveedor/)).toHaveFocus();
      expect(screen.getByLabelText(/Código de proveedor/)).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("dialog", { name: DIALOG })).toBeInTheDocument();
    });

    it("UI-PLS-005 with one required input empty sends nothing and focuses that one", async () => {
      const user = userEvent.setup();
      setup();
      await fillValid(user);

      await user.clear(screen.getByLabelText(/Dirección/));
      await user.click(submit());

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(screen.getByText("La dirección es obligatoria")).toBeInTheDocument();
      expect(screen.queryByText("El nombre es obligatorio")).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Dirección/)).toHaveFocus();
    });

    it("UI-PLS-005 with no supply chosen sends nothing and focuses the supply", async () => {
      const user = userEvent.setup();
      setup();
      await user.type(screen.getByLabelText(/Código de proveedor/), "NE=9");
      await user.type(screen.getByLabelText(/^Nombre/), "Planta Oeste");
      await user.type(screen.getByLabelText(/Dirección/), "Calle Luna 3");
      await user.type(screen.getByLabelText(/Potencia pico/), "5");
      await user.type(screen.getByLabelText(/Potencia nominal/), "4");

      await user.click(submit());

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(screen.getByText("El punto de suministro es obligatorio")).toBeInTheDocument();
      expect(supplyInput()).toHaveFocus();
    });

    it("UI-PLS-005 with a peak power of 0 sends nothing, says so on the peak power, and focuses it", async () => {
      const user = userEvent.setup();
      setup();
      await fillValid(user);

      await user.clear(screen.getByLabelText(/Potencia pico/));
      await user.type(screen.getByLabelText(/Potencia pico/), "0");
      await user.click(submit());

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Potencia pico/)).toHaveAccessibleDescription(
        "Por favor, introduce un número mayor que 0",
      );
      expect(screen.getByLabelText(/Potencia pico/)).toHaveFocus();
    });

    it("UI-PLS-005 with several failing inputs focuses the first in the form's order, not the first typed", async () => {
      const user = userEvent.setup();
      setup();
      await fillValid(user);

      await user.clear(screen.getByLabelText(/Potencia pico/));
      await user.clear(screen.getByLabelText(/^Nombre/));
      await user.click(submit());

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/^Nombre/)).toHaveFocus();
      expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
      expect(screen.getByText("Por favor, introduce un número mayor que 0")).toBeInTheDocument();
    });

    it("UI-PLS-005 sends once the inputs are corrected, and stops saying what was wrong", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(submit());

      await fillValid(user);

      expect(screen.queryByText("El nombre es obligatorio")).not.toBeInTheDocument();
      expect(screen.queryByText("El punto de suministro es obligatorio")).not.toBeInTheDocument();
      await user.click(submit());
      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    });
  });

  it("UI-PLS-006 while the save is in flight, the supply and the connection date are read-only too", async () => {
    mockMutateAsync.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    setup();
    await fillValid(user);

    await user.click(submit());

    expect(await screen.findByRole("button", { name: "Creando..." })).toBeDisabled();
    expect(supplyInput()).toHaveAttribute("readonly");
    for (const section of screen.getAllByRole("spinbutton", { name: /^(Dia|Mes|Año)$/ })) {
      expect(section).toHaveAttribute("aria-readonly", "true");
    }
    expect(screen.getByRole("button", { name: /Elige fecha/ })).toBeDisabled();
  });

  describe("a refusal", () => {
    it("UI-ERR-005 a 409 SUPPLY_ALREADY_HAS_PLANT shows the catalogue's text, and the form stays as typed", async () => {
      mockMutateAsync.mockRejectedValue(apiError(409, { code: "SUPPLY_ALREADY_HAS_PLANT" }));
      const user = userEvent.setup();
      setup();
      await fillValid(user);

      await user.click(submit());

      await waitFor(() =>
        expect(mockErrorDispatch).toHaveBeenCalledWith("Este punto de suministro ya pertenece a otra planta."),
      );
      expect(onClose).not.toHaveBeenCalled();
      const dialog = screen.getByRole("dialog", { name: DIALOG });
      expect(within(dialog).getByLabelText(/^Nombre/)).toHaveValue("Planta Oeste");
      expect(supplyInput()).toHaveValue("Casa Este (ES0003)");
    });

    it("UI-ERR-005 shows the server's message for a refusal whose code the catalogue does not map", async () => {
      mockMutateAsync.mockRejectedValue(apiError(400, { code: null }));
      const user = userEvent.setup();
      setup();
      await fillValid(user);

      await user.click(submit());

      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith("raw backend message"));
    });

    it("keeps the generic message for a failure without an error detail (#253)", async () => {
      mockMutateAsync.mockRejectedValue(apiError(500));
      const user = userEvent.setup();
      setup();
      await fillValid(user);

      await user.click(submit());

      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(GENERIC));
    });
  });

  describe("the address (#411)", () => {
    const address = () => screen.getByRole("textbox", { name: /^Dirección/ });

    it("UI-FRM-001 refuses the 251st character", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(address());
      await user.paste("a".repeat(250));
      await user.type(address(), "b");

      expect(address()).toHaveValue("a".repeat(250));
    });

    it("UI-FRM-002 Enter in the address submits the form, and adds no line break", async () => {
      const user = userEvent.setup();
      setup();
      await fillValid(user);

      await user.type(address(), "{Enter}");

      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
      expect(mockMutateAsync.mock.calls[0][0].data.address).toBe("Calle Luna 3");
    });

    it("UI-ERR-002 UI-ERR-007 shows FIELD_TOO_LONG on the address input, focuses it, keeps every value and clears once edited", async () => {
      mockMutateAsync.mockRejectedValue(
        apiError(400, { code: "FIELD_TOO_LONG", params: { field: "address", maxLength: "250", n: "251" } }),
      );
      const user = userEvent.setup();
      setup();
      await fillValid(user);

      await user.click(submit());

      await waitFor(() =>
        expect(address()).toHaveAccessibleDescription(
          "La dirección puede tener como máximo 250 caracteres. Ahora tiene 251.",
        ),
      );
      await waitFor(() => expect(address()).toHaveFocus());
      expect(mockErrorDispatch).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/^Nombre/)).toHaveValue("Planta Oeste");
      expect(supplyInput()).toHaveValue("Casa Este (ES0003)");
      expect(address()).toHaveValue("Calle Luna 3");

      await user.type(screen.getByLabelText(/^Nombre/), "s");
      expect(address()).toBeInvalid();
      await user.type(address(), "X");
      expect(address()).toBeValid();
    });

    it("UI-OVL-002 the address is read-only while the save is in flight", async () => {
      mockMutateAsync.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      setup();
      await fillValid(user);

      await user.click(submit());

      await screen.findByRole("button", { name: "Creando..." });
      expect(address()).toHaveAttribute("readonly");
    });
  });

  describe("UI-PLS-007 the connection-date picker, in the sheet at a phone's width", () => {
    beforeEach(() => stubViewport(390));
    afterEach(() => vi.unstubAllGlobals());

    const openCalendar = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole("button", { name: /Elige fecha/ }));
      return screen.findByRole("grid");
    };

    it("UI-PLS-007 opens in place: no second modal dialog over the form", async () => {
      const user = userEvent.setup();
      setup();

      await openCalendar(user);

      const modals = screen.getAllByRole("dialog").filter((dialog) => dialog.getAttribute("aria-modal") === "true");
      expect(modals).toHaveLength(1);
      expect(modals[0]).toHaveAccessibleName(DIALOG);
    });

    it("UI-PLS-007 choosing a date keeps the sheet and everything typed", async () => {
      const user = userEvent.setup();
      setup();
      await user.type(screen.getByLabelText(/^Nombre/), "Planta Oeste");

      const calendar = await openCalendar(user);
      await user.click(within(calendar).getByRole("gridcell", { name: "15" }));

      await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
      const dialog = screen.getByRole("dialog", { name: DIALOG });
      expect(within(dialog).getByLabelText(/^Nombre/)).toHaveValue("Planta Oeste");
      expect(within(dialog).getByRole("spinbutton", { name: "Dia" })).toHaveTextContent("15");
    });

    it("UI-PLS-007 Escape closes the calendar, and leaves the form open", async () => {
      const user = userEvent.setup();
      setup();
      await openCalendar(user);
      // Focus sits in the calendar, so the key below reaches the picker first.
      expect(screen.getByRole("grid")).toContainElement(document.activeElement as HTMLElement);

      fireEvent.keyDown(document.activeElement!, { key: "Escape" });

      await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
      expect(screen.getByRole("dialog", { name: DIALOG })).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
