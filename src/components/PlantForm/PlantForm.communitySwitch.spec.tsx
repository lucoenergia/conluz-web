import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { useActiveCommunity } from "../../context/community.context";
import type { SupplyResponse } from "../../api/models";
import { buildSupply } from "../../test/fixtures";
import { useGetAllSupplies, type getAllSupplies } from "../../api/supplies/supplies";

const SUPPLIES_BY_COMMUNITY: Record<string, SupplyResponse[]> = {
  "community-a": [buildSupply({ id: "supply-a", code: "CODE-A", name: "Supply A" })],
  "community-b": [buildSupply({ id: "supply-b", code: "CODE-B", name: "Supply B" })],
};

vi.mock(import("../../api/supplies/supplies"), () => ({
  useGetAllSupplies: vi.fn(),
}));

import { PlantForm } from "./PlantForm";

const handleSubmit = vi.fn();

/** Mirrors AuthenticatedLayout's keyed Outlet. */
function KeyedForm() {
  const communityId = useActiveCommunity();
  return <PlantForm key={communityId} handleSubmit={handleSubmit} selectedSupplyCode="CODE-A" />;
}

function renderForm(communityId: string) {
  const { switchActiveCommunity } = renderWithProviders(<KeyedForm />, { activeCommunityId: communityId });
  return { switchTo: (id: string) => switchActiveCommunity(id) };
}

describe("PlantForm across a community switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // PlantForm enables the query whenever a community is active.
    vi.mocked(useGetAllSupplies).mockImplementation((communityId) =>
      query.success<typeof getAllSupplies>({ items: SUPPLIES_BY_COMMUNITY[communityId] ?? [] }),
    );
  });

  // selectedSupply was only ever set, never cleared: after a switch the picker
  // listed community B's supplies while the form still held community A's
  // selection, and submitting wrote that foreign supplyCode.
  it("drops the previous community's selected supply", async () => {
    const { switchTo } = renderForm("community-a");
    await waitFor(() => {
      expect(screen.getByDisplayValue(/Supply A/)).toBeInTheDocument();
    });

    switchTo("community-b");

    await waitFor(() => {
      expect(screen.queryByDisplayValue(/Supply A/)).not.toBeInTheDocument();
    });
  });
});
