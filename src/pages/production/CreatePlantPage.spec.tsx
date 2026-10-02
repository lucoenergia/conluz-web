import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
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

const mockNavigate = vi.fn();
vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { getAllSupplies, useGetAllSupplies } from "../../api/supplies/supplies";
import { useCreatePlant } from "../../api/plants/plants";
import { CreatePlantPage } from "./CreatePlantPage";

const COMMUNITY_ID = "community-a";
const mockMutateAsync = vi.fn();

function setup(canCreatePlants: boolean) {
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: COMMUNITY_ID,
        capabilities: buildCommunityCapabilities({ canRead: true, canCreatePlants }),
      }),
    ),
  );
  vi.mocked(useGetAllSupplies).mockReturnValue(
    query.success<typeof getAllSupplies>({
      items: [
        buildSupply({
          id: "supply-1",
          code: "ES0001",
          name: null,
          community: { id: COMMUNITY_ID, name: "Sol Común" },
          capabilities: buildSupplyCapabilities({ canRead: true, canCreatePlant: true }),
        }),
      ],
      size: 10000,
      totalElements: 1,
      totalPages: 1,
      number: 0,
    }),
  );
  vi.mocked(useCreatePlant).mockReturnValue(mutation.idle({ mutateAsync: mockMutateAsync }));

  return renderWithProviders(<CreatePlantPage />, { activeCommunityId: COMMUNITY_ID });
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Código de proveedor", { exact: false }), "NE=1");
  await user.type(screen.getByLabelText("Nombre", { exact: false }), "Planta Norte");
  await user.type(screen.getByLabelText("Dirección", { exact: false }), "Calle Sol 1");
  await user.type(screen.getByLabelText("Potencia total", { exact: false }), "63");
  await user.click(screen.getByRole("combobox", { name: /Punto de suministro/ }));
  await user.click(await screen.findByRole("option", { name: /ES0001/ }));
  await user.click(screen.getByRole("button", { name: "Crear planta" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreatePlantPage", () => {
  it("creates the plant through the action when the community permits it", async () => {
    mockMutateAsync.mockResolvedValue({ id: "plant-1" });
    const user = userEvent.setup();
    setup(true);

    await fillAndSubmit(user);

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        data: expect.objectContaining({ providerCode: "NE=1", name: "Planta Norte", supplyCode: "ES0001" }),
      }),
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/production"));
  });

  // The route guard already refuses this, so it is the second line rather than
  // the first -- but the form must not present itself as a live write path.
  it("offers no way to submit when the community does not permit creating plants", async () => {
    const user = userEvent.setup();
    setup(false);

    expect(screen.getByRole("button", { name: "Crear planta" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Crear planta" }));

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("stays on the form when creating fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    setup(true);

    await fillAndSubmit(user);

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
