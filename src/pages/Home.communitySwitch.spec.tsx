import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { query } from "../test/queryState";
import { buildSupply, buildUser } from "../test/fixtures";
import { useActiveCommunity } from "../context/community.context";
import { CommunityRole } from "../api/models";
import type { SupplyResponse } from "../api/models";
import { useGetSuppliesByUserId } from "../api/users/users";
import {
  useGetAllSupplies,
  useGetSupplyDailyConsumption,
  useGetSupplyDailyProduction,
  type getAllSupplies,
} from "../api/supplies/supplies";

const SUPPLIES_BY_COMMUNITY: Record<string, SupplyResponse[]> = {
  "community-a": [buildSupply({ id: "supply-a", name: "Supply A", address: "Street A" })],
  "community-b": [buildSupply({ id: "supply-b", name: "Supply B", address: "Street B" })],
};

/** Every supply id the consumption/production panels actually requested. */
const requestedSupplyIds: string[] = [];

// The charts are irrelevant here and ApexCharts needs a ResizeObserver that
// jsdom does not provide.
vi.mock("../components/Graph/GraphBar", () => ({ GraphBar: () => <div /> }));
vi.mock("../components/Graph/MultiSeriesBar", () => ({ MultiSeriesBar: () => <div /> }));

vi.mock(import("../api/users/users"), () => ({
  useGetSuppliesByUserId: vi.fn(),
}));

vi.mock(import("../api/supplies/supplies"), () => ({
  useGetAllSupplies: vi.fn(),
  useGetSupplyDailyProduction: vi.fn(),
  useGetSupplyDailyConsumption: vi.fn(),
}));

vi.mock(import("../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () =>
    buildUser({
      id: "user-1",
      isPlatformAdmin: false,
      memberships: {
        "community-a": CommunityRole.COMMUNITY_ADMIN,
        "community-b": CommunityRole.COMMUNITY_ADMIN,
      },
    }),
}));

import { HomePage } from "./Home";

/** Mirrors AuthenticatedLayout's keyed Outlet. */
function Keyed() {
  const communityId = useActiveCommunity();
  return <HomePage key={communityId} />;
}

function renderHome(communityId: string) {
  const { switchActiveCommunity } = renderWithProviders(<Keyed />, { activeCommunityId: communityId });
  return { switchTo: (id: string) => switchActiveCommunity(id) };
}

describe("HomePage across a community switch", () => {
  beforeEach(() => {
    requestedSupplyIds.length = 0;
    // The user is a community admin, so Home disables the per-user supplies query.
    vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
    vi.mocked(useGetAllSupplies).mockImplementation((communityId) =>
      query.success<typeof getAllSupplies>({ items: SUPPLIES_BY_COMMUNITY[communityId] ?? [] }),
    );
    // The panels only read data, which stays undefined while the fetch is in flight.
    vi.mocked(useGetSupplyDailyProduction).mockImplementation((supplyId) => {
      if (supplyId) requestedSupplyIds.push(supplyId);
      return query.loading();
    });
    vi.mocked(useGetSupplyDailyConsumption).mockImplementation((supplyId) => {
      if (supplyId) requestedSupplyIds.push(supplyId);
      return query.loading();
    });
  });

  // The old behaviour: selectedSupplyPoint kept community A's supply id, so the
  // autocomplete rendered blank (no matching option) while the panels carried on
  // fetching the previous community's supply -- and the preselect effect, which
  // only fires when the value is null, never recovered.
  it("re-preselects a supply from the new community", async () => {
    const { switchTo } = renderHome("community-a");
    await waitFor(() => {
      expect(screen.getByLabelText("Puntos de suministro")).toHaveValue("Supply A - Street A");
    });

    switchTo("community-b");

    await waitFor(() => {
      expect(screen.getByLabelText("Puntos de suministro")).toHaveValue("Supply B - Street B");
    });
  });

  it("stops querying the previous community's supply", async () => {
    const { switchTo } = renderHome("community-a");
    await waitFor(() => expect(requestedSupplyIds).toContain("supply-a"));

    // Everything recorded from here on belongs to the new community.
    requestedSupplyIds.length = 0;
    switchTo("community-b");

    await waitFor(() => expect(requestedSupplyIds).toContain("supply-b"));
    expect(requestedSupplyIds).not.toContain("supply-a");
  });
});
