import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import type { SupplyResponse } from "../../api/models";
import { buildCommunity, buildCommunityCapabilities, buildPlant, buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
import { useGetAllSupplies, type getAllSupplies } from "../../api/supplies/supplies";
import { useGetCommunityById, type getCommunityById } from "../../api/communities/communities";
import { useCreatePlant } from "../../api/plants/plants";

const supplyOf = (id: string, code: string, name: string) =>
  buildSupply({ id, code, name, capabilities: buildSupplyCapabilities({ canRead: true, canCreatePlant: true }) });

const SUPPLIES_BY_COMMUNITY: Record<string, SupplyResponse[]> = {
  "community-a": [supplyOf("supply-a", "CODE-A", "Supply A"), supplyOf("supply-a2", "CODE-A2", "Supply A2")],
  "community-b": [supplyOf("supply-b", "CODE-B", "Supply B"), supplyOf("supply-b2", "CODE-B2", "Supply B2")],
};

vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreatePlant: vi.fn(),
}));

import { PlantFormDialog } from "./PlantFormDialog";

const mutateAsync = vi.fn();

/**
 * Rendered without the layout's keyed Outlet, which in the app closes the
 * form on a switch: this is the form's own guard, should it ever outlive one.
 */
function renderForm(communityId: string) {
  const { switchActiveCommunity } = renderWithProviders(
    <PlantFormDialog target={{ kind: "create" }} onClose={vi.fn()} />,
    { activeCommunityId: communityId },
  );
  return { switchTo: (id: string) => switchActiveCommunity(id) };
}

describe("PlantFormDialog across a community switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAllSupplies).mockImplementation((communityId) =>
      query.success<typeof getAllSupplies>({ items: SUPPLIES_BY_COMMUNITY[communityId] ?? [] }),
    );
    vi.mocked(useGetCommunityById).mockImplementation((communityId) =>
      query.success<typeof getCommunityById>(
        buildCommunity({ id: communityId, capabilities: buildCommunityCapabilities({ canRead: true, canCreatePlants: true }) }),
      ),
    );
    mutateAsync.mockResolvedValue(buildPlant());
    vi.mocked(useCreatePlant).mockReturnValue(mutation.idle({ mutateAsync }));
  });

  // The chosen supply was once held as an object, never cleared: after a
  // switch the picker listed community B's supplies while the form still held
  // community A's, and submitting wrote that foreign supplyCode.
  it("drops the previous community's selected supply, and never sends it", async () => {
    const user = userEvent.setup();
    const { switchTo } = renderForm("community-a");
    await user.click(screen.getByRole("combobox", { name: /Punto de suministro/ }));
    await user.click(await screen.findByRole("option", { name: /CODE-A\)/ }));
    expect(screen.getByDisplayValue(/Supply A/)).toBeInTheDocument();

    switchTo("community-b");

    await waitFor(() => {
      expect(screen.queryByDisplayValue(/Supply A/)).not.toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Código de proveedor/), "NE=1");
    await user.type(screen.getByLabelText(/^Nombre/), "Planta");
    await user.type(screen.getByLabelText(/Dirección/), "Calle 1");
    await user.type(screen.getByLabelText(/Potencia total/), "5");
    await user.click(screen.getByRole("button", { name: "Crear planta" }));

    expect(screen.getByText("El punto de suministro es obligatorio")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
