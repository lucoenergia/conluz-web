import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
import { apiError } from "../../test/apiError";
import type { RestErrorDetailCode, SupplyCapabilitiesResponse } from "../../api/models";

const SUPPLY_ID = "supply-1";
const COMMUNITY_ID = "community-a";
const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const SERVER_MESSAGE = "TEST-SERVER-MESSAGE";
const GENERIC = "Ha habido un problema al editar el punto de suministro. Por favor, inténtalo más tarde";

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock(import("./useSupplyInActiveCommunity"), () => ({ useSupplyInActiveCommunity: vi.fn() }));

// The owner picker loads the user list; answer with a settled, empty page.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
}));

// Reads stubbed, mutations left real: the gate under test is the one inside
// useSupplyActions, and stubbing that would restate it rather than run it.
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdateSupply: vi.fn(),
}));

import { getAllUsers, useGetAllUsers } from "../../api/users/users";
import { useUpdateSupply } from "../../api/supplies/supplies";
import { mutation } from "../../test/queryState";
import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import { EditSupplyPage } from "./EditSupply";

const mutateAsync = vi.fn();

function setup(capabilities: Partial<SupplyCapabilitiesResponse> = { canEdit: true }) {
  vi.mocked(useSupplyInActiveCommunity).mockReturnValue({
    supply: buildSupply({
      id: SUPPLY_ID,
      code: "ES0021000000000000AA",
      name: "Casa",
      address: "Calle Mayor 1",
      addressRef: "REF",
      community: { id: COMMUNITY_ID, name: "Sol Común" },
      capabilities: buildSupplyCapabilities(capabilities),
    }),
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  });

  return renderWithProviders(<EditSupplyPage />, {
    route: `/supply-points/${SUPPLY_ID}/edit`,
    activeCommunityId: COMMUNITY_ID,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue(buildSupply());
  vi.mocked(useUpdateSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useGetAllUsers).mockReturnValue(
    query.success<typeof getAllUsers>({ items: [], size: 10000, totalElements: 0, totalPages: 1, number: 0 }),
  );
});

describe("EditSupplyPage", () => {
  it("saves through the action when the supply permits editing", async () => {
    setup({ canEdit: true });

    await userEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        supplyId: SUPPLY_ID,
        data: expect.objectContaining({ code: "ES0021000000000000AA", address: "Calle Mayor 1" }),
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith("/supply-points");
  });

  // The route guard already refuses this, so it is the second line rather than
  // the first -- but the form must not present itself as a live write path.
  it("offers no way to submit when the supply does not permit editing", async () => {
    setup({ canEdit: false });

    expect(screen.getByRole("button", { name: /Guardar cambios/i })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("offers the submit once the supply permits editing", () => {
    setup({ canEdit: true });

    expect(screen.getByRole("button", { name: /Guardar cambios/i })).not.toBeDisabled();
  });

  it("sends no address reference rather than an empty one", async () => {
    setup({ canEdit: true });

    await userEvent.clear(screen.getByLabelText(/Referencia catastral/i));
    await userEvent.click(screen.getByRole("button", { name: /Guardar cambios/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0].data.addressRef).toBeUndefined();
  });
});

describe("EditSupplyPage: naming the supply", () => {
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
    renderWithProviders(<EditSupplyPage />, {
      route: `/supply-points/${SUPPLY_ID}/edit`,
      activeCommunityId: COMMUNITY_ID,
    });

    expect(screen.getByText("Plaza del Pueblo 3")).toBeInTheDocument();
    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
  });
});

describe("EditSupplyPage: a refused edit", () => {
  const nameInput = () => screen.getByRole("textbox", { name: /^Nombre/ });
  const cupsInput = () => screen.getByRole("textbox", { name: /^CUPS/ });
  const addressInput = () => screen.getByRole("textbox", { name: /^Dirección/ });

  async function editAndSubmit(u: ReturnType<typeof userEvent.setup>) {
    await u.clear(cupsInput());
    await u.type(cupsInput(), "ES0031300119158001DL0F");
    await u.type(addressInput(), ", bajo");
    await u.click(screen.getByRole("button", { name: /Guardar cambios/i }));
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
    expect(screen.queryByText(SERVER_MESSAGE)).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
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
    expect(cupsInput()).toBeValid();
    expect(mockNavigate).not.toHaveBeenCalled();
    expectTypedValuesKept();
  });
});
