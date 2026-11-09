import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildMemberRecord, buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
import { apiError } from "../../test/apiError";
import type { RestErrorDetailCode, SupplyCapabilitiesResponse, SupplyResponse } from "../../api/models";

const SUPPLY_ID = "supply-1";
const COMMUNITY_ID = "community-a";
const mockErrorDispatch = vi.fn();
const onClose = vi.fn();
const SERVER_MESSAGE = "TEST-SERVER-MESSAGE";
const GENERIC = "Ha habido un problema al editar el punto de suministro. Por favor, inténtalo más tarde";

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock(import("./useSupplyInActiveCommunity"), () => ({ useSupplyInActiveCommunity: vi.fn() }));

// Stubbed so a test can prove the edit form reads no owner listing at all.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
}));
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMemberships: vi.fn(),
}));

// Reads stubbed, mutations left real: the gate under test is the one inside
// useSupplyActions, and stubbing that would restate it rather than run it.
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdateSupply: vi.fn(),
}));

import { useUpdateSupply } from "../../api/supplies/supplies";
import { useGetAllUsers } from "../../api/users/users";
import { useGetMemberships } from "../../api/memberships/memberships";
import { mutation } from "../../test/queryState";
import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import { SupplyFormDialog } from "./SupplyFormDialog";

const mutateAsync = vi.fn();

function setup(
  capabilities: Partial<SupplyCapabilitiesResponse> = { canEdit: true },
  supply: Partial<SupplyResponse> = {},
) {
  vi.mocked(useSupplyInActiveCommunity).mockReturnValue({
    supply: buildSupply({
      id: SUPPLY_ID,
      code: "ES0021000000000000AA",
      name: "Casa",
      address: "Calle Mayor 1",
      addressRef: "REF",
      community: { id: COMMUNITY_ID, name: "Sol Común" },
      capabilities: buildSupplyCapabilities(capabilities),
      ...supply,
    }),
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  });

  return renderDialog();
}

const renderDialog = () =>
  renderWithProviders(<SupplyFormDialog target={{ kind: "edit", supplyId: SUPPLY_ID }} onClose={onClose} />, {
    activeCommunityId: COMMUNITY_ID,
  });

const DIALOG = "Editar punto de suministro";
const saveButton = () => screen.getByRole("button", { name: "Guardar" });

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue(buildSupply());
  vi.mocked(useUpdateSupply).mockReturnValue(mutation.idle({ mutateAsync }));
});

/**
 * The supply form in edit mode (#372): what it loads, what it sends, where a
 * refusal lands. Where it opens from, its overlay behaviour and a refetch
 * while it is open are SupplyPointsPage.supplyForm.spec.tsx's.
 */
describe("SupplyFormDialog: editing", () => {
  it("UI-OVL-006 is a dialog named by its title", () => {
    setup({ canEdit: true });

    expect(screen.getByRole("dialog", { name: DIALOG })).toBeInTheDocument();
  });

  it("saves through the action when the supply permits editing, and closes", async () => {
    setup({ canEdit: true });

    await userEvent.click(saveButton());

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        supplyId: SUPPLY_ID,
        data: expect.objectContaining({ code: "ES0021000000000000AA", address: "Calle Mayor 1" }),
      });
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  // The row menu already offers no "Editar" here, so it is the second line
  // rather than the first -- but the form must not present itself as a live
  // write path.
  it("offers no way to submit when the supply does not permit editing", async () => {
    setup({ canEdit: false });

    expect(saveButton()).toBeDisabled();

    await userEvent.click(saveButton());
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("offers the submit once the supply permits editing", () => {
    setup({ canEdit: true });

    expect(saveButton()).not.toBeDisabled();
  });

  it("sends no address reference rather than an empty one", async () => {
    setup({ canEdit: true });

    await userEvent.clear(screen.getByLabelText(/Referencia catastral/i));
    await userEvent.click(saveButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0].data.addressRef).toBeUndefined();
  });
});

describe("SupplyFormDialog: naming the supply", () => {
  it("UI-SUP-010 names a supply without a name by its address under the title", () => {
    vi.mocked(useSupplyInActiveCommunity).mockReturnValue({
      supply: buildSupply({
        id: SUPPLY_ID,
        name: null,
        address: "Plaza del Pueblo 3",
        community: { id: COMMUNITY_ID, name: "Sol Común" },
        capabilities: buildSupplyCapabilities({ canEdit: true }),
      }),
      isLoading: false,
      isNotFound: false,
      error: null,
      refetch: vi.fn(),
    });
    renderDialog();

    expect(screen.getByText("Plaza del Pueblo 3")).toBeInTheDocument();
    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
  });
});

describe("SupplyFormDialog: a refused edit", () => {
  const nameInput = () => screen.getByRole("textbox", { name: /^Nombre/ });
  const cupsInput = () => screen.getByRole("textbox", { name: /^CUPS/ });
  const addressInput = () => screen.getByRole("textbox", { name: /^Dirección/ });

  async function editAndSubmit(u: ReturnType<typeof userEvent.setup>) {
    await u.clear(cupsInput());
    await u.type(cupsInput(), "ES0031300119158001DL0F");
    await u.type(addressInput(), ", bajo");
    await u.click(saveButton());
  }

  function expectTypedValuesKept() {
    expect(nameInput()).toHaveValue("Casa");
    expect(cupsInput()).toHaveValue("ES0031300119158001DL0F");
    expect(addressInput()).toHaveValue("Calle Mayor 1, bajo");
  }

  it.each<[RestErrorDetailCode, string]>([
    ["SUPPLY_CUPS_INVALID", "El CUPS tiene que tener 20 o 22 caracteres, sin espacios."],
    ["SUPPLY_ALREADY_EXISTS", "Ya hay un punto de suministro con este CUPS en la comunidad."],
    ["SUPPLY_REGISTERED_IN_ANOTHER_COMMUNITY", "Este CUPS ya está registrado en otra comunidad."],
  ])("UI-SUP-009 UI-ERR-002 shows %s on the CUPS input and keeps every typed value", async (code, message) => {
    mutateAsync.mockRejectedValue(apiError(400, { code, message: SERVER_MESSAGE }));
    const u = userEvent.setup();
    setup({ canEdit: true });

    await editAndSubmit(u);

    await waitFor(() => expect(cupsInput()).toHaveAccessibleDescription(message));
    expect(cupsInput()).toBeInvalid();
    await waitFor(() => expect(cupsInput()).toHaveFocus());
    expect(screen.queryByText(SERVER_MESSAGE)).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });

  it("UI-ERR-002 clears the CUPS error once the CUPS is edited, not when another input is", async () => {
    mutateAsync.mockRejectedValue(apiError(400, { code: "SUPPLY_CUPS_INVALID", message: SERVER_MESSAGE }));
    const u = userEvent.setup();
    setup({ canEdit: true });
    await editAndSubmit(u);
    await waitFor(() => expect(cupsInput()).toBeInvalid());

    await u.type(nameInput(), "s");
    expect(cupsInput()).toBeInvalid();

    await u.type(cupsInput(), "X");
    expect(cupsInput()).toBeValid();
    expect(cupsInput()).not.toHaveAccessibleDescription();
  });

  it("UI-ERR-001 keeps the generic message for a refusal the form cannot place", async () => {
    mutateAsync.mockRejectedValue(apiError(500));
    const u = userEvent.setup();
    setup({ canEdit: true });

    await editAndSubmit(u);

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(GENERIC));
    expect(screen.getByRole("dialog", { name: DIALOG })).toBeInTheDocument();
    expect(cupsInput()).toBeValid();
    expect(onClose).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });
});

describe("SupplyFormDialog: the owner", () => {
  const ownerInput = () => screen.getByRole("textbox", { name: "Propietario" });

  it("UI-SUP-005 shows the owner's record in the supply's community, read-only", () => {
    setup({ canEdit: true }, { user: { id: "u-ana" }, ownerRecord: buildMemberRecord({ fullName: "Lucía Martínez Soler" }) });

    expect(ownerInput()).toHaveValue("Lucía Martínez Soler");
    expect(ownerInput()).toHaveAttribute("readonly");
  });

  it("UI-SUP-005 shows «-» when the supply has no owner record in its community", () => {
    setup({ canEdit: true }, { user: { id: "u-ana" }, ownerRecord: null });

    expect(ownerInput()).toHaveValue("-");
    expect(ownerInput()).toHaveAttribute("readonly");
  });

  it("UI-SUP-018 reads neither the platform-wide user listing nor the community's memberships", async () => {
    setup({ canEdit: true }, { ownerRecord: buildMemberRecord({ fullName: "Lucía Martínez Soler" }) });

    await userEvent.click(saveButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(vi.mocked(useGetAllUsers)).not.toHaveBeenCalled();
    expect(vi.mocked(useGetMemberships)).not.toHaveBeenCalled();
    expect(mutateAsync.mock.calls[0][0].data).not.toHaveProperty("personalId");
  });
});

describe("UI-SUP-020 the edit submit", () => {
  it.each([
    ["a supply with no name", null],
    ["a named supply", "Casa"],
  ])("UI-SUP-020 reads Guardar for %s", (_, name) => {
    setup({ canEdit: true }, { name });

    expect(within(screen.getByRole("dialog", { name: DIALOG })).getByRole("button", { name: "Guardar" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Crear punto de suministro|Guardar cambios/ })).not.toBeInTheDocument();
  });

  it("UI-SUP-021 reads Guardando... while the save is in flight", async () => {
    mutateAsync.mockReturnValue(new Promise(() => {}));
    setup({ canEdit: true });

    await userEvent.click(saveButton());

    expect(await screen.findByRole("button", { name: "Guardando..." })).toBeDisabled();
    for (const field of screen.getAllByRole("textbox")) expect(field).toHaveAttribute("readonly");
  });
});

describe("SupplyFormDialog: the supply being loaded", () => {
  const loadState = (state: Partial<ReturnType<typeof useSupplyInActiveCommunity>>) =>
    vi.mocked(useSupplyInActiveCommunity).mockReturnValue({
      supply: undefined,
      isLoading: false,
      isNotFound: false,
      error: null,
      refetch: vi.fn(),
      ...state,
    });

  it("shows its progress in the overlay while the supply loads, with nothing to submit", () => {
    loadState({ isLoading: true });
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: DIALOG });
    expect(within(dialog).getByRole("progressbar")).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("says, as the detail page does, that a supply it cannot find does not exist", () => {
    loadState({ isNotFound: true });
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: DIALOG });
    expect(within(dialog).getByRole("heading", { name: "Punto de suministro no encontrado" })).toBeInTheDocument();
    expect(
      within(dialog).getByText("Este punto de suministro no existe o no tienes acceso a su comunidad."),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("reports a failed load and offers it again, with the detail page's words", async () => {
    const refetch = vi.fn();
    loadState({ error: apiError(500), refetch });
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: DIALOG });
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Ha habido un problema al cargar la información de este punto de suministro. Por favor, inténtalo más tarde",
    );
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("asks for the supply it was opened for", () => {
    setup({ canEdit: true });

    expect(vi.mocked(useSupplyInActiveCommunity)).toHaveBeenCalledWith(SUPPLY_ID);
  });
});
