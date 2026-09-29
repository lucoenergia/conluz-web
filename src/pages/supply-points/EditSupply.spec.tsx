import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
import type { SupplyCapabilitiesResponse } from "../../api/models";

const SUPPLY_ID = "supply-1";
const COMMUNITY_ID = "community-a";
const mockNavigate = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
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
