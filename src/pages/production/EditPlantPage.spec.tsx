import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import {
  buildPlant,
  buildPlantCapabilities,
  buildSupply,
  buildSupplyCapabilities,
  buildSupplyReference,
} from "../../test/fixtures";

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

const mockNavigate = vi.fn();
vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";
import { getAllSupplies, useGetAllSupplies } from "../../api/supplies/supplies";
import { useUpdatePlant } from "../../api/plants/plants";
import { EditPlantPage } from "./EditPlantPage";

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-1";
const mockMutateAsync = vi.fn();

function setup(options: { canManage?: boolean; isNotFound?: boolean } = {}) {
  const { canManage = true, isNotFound = false } = options;

  vi.mocked(usePlantInActiveCommunity).mockReturnValue({
    plant: isNotFound
      ? undefined
      : buildPlant({
          id: PLANT_ID,
          name: "Planta Norte",
          providerCode: "NE=1",
          address: "Calle Sol 1",
          totalPower: 63,
          supply: buildSupplyReference({ id: "supply-1", code: "ES0001" }),
          community: { id: COMMUNITY_ID },
          capabilities: buildPlantCapabilities({ canRead: true, canManage }),
        }),
    isLoading: false,
    isNotFound,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useGetAllSupplies).mockReturnValue(
    query.success<typeof getAllSupplies>({
      items: [
        buildSupply({
          id: "supply-1",
          code: "ES0001",
          name: null,
          community: { id: COMMUNITY_ID, name: "Sol Común" },
          capabilities: buildSupplyCapabilities({ canRead: true, canCreatePlant: false }),
        }),
      ],
      size: 10000,
      totalElements: 1,
      totalPages: 1,
      number: 0,
    }),
  );
  vi.mocked(useUpdatePlant).mockReturnValue(mutation.idle({ mutateAsync: mockMutateAsync }));

  return renderWithProviders(
    <Routes>
      <Route path="/production/:plantId/edit" element={<EditPlantPage />} />
    </Routes>,
    { route: `/production/${PLANT_ID}/edit`, activeCommunityId: COMMUNITY_ID },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditPlantPage", () => {
  it("saves through the action when the plant permits managing it", async () => {
    mockMutateAsync.mockResolvedValue({ id: PLANT_ID });
    const user = userEvent.setup();
    setup({ canManage: true });

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        plantId: PLANT_ID,
        data: expect.objectContaining({ name: "Planta Norte", supplyCode: "ES0001" }),
      }),
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/production"));
  });

  // The route guard already refuses this, so it is the second line rather than
  // the first -- but the form must not present itself as a live write path.
  it("offers no way to submit when the plant does not permit managing it", async () => {
    const user = userEvent.setup();
    setup({ canManage: false });

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("renders one empty state for a missing or foreign plant, and no form", () => {
    setup({ isNotFound: true });

    expect(screen.getByText("Planta no encontrada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
  });

  it("keeps the plant's own supply selectable even though the caller may not start a plant on it", () => {
    setup({ canManage: true });

    expect(screen.getByDisplayValue(/ES0001/)).toBeInTheDocument();
  });
});
