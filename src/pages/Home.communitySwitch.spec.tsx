import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { query } from "../test/queryState";
import { buildCurrentUser, buildSupply } from "../test/fixtures";
import { useActiveCommunity } from "../context/community.context";
import { CommunityRole } from "../api/models";
import type { SupplyResponse } from "../api/models";
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

vi.mock(import("../api/supplies/supplies"), () => ({
  useGetAllSupplies: vi.fn(),
  useGetSupplyDailyProduction: vi.fn(),
  useGetSupplyDailyConsumption: vi.fn(),
}));

// A plain member of both. The role is here so CommunityProvider accepts the
// two ids as memberships, not because the screen reads it -- and a member is
// the case that used to be untestable here: the per-user supplies endpoint
// Home called for them is keyed by user, so its query key could not change
// when the community did, and the switch below would have failed.
vi.mock(import("../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () =>
    buildCurrentUser({
      id: "user-1",
      isPlatformAdmin: false,
      memberships: {
        "community-a": CommunityRole.COMMUNITY_MEMBER,
        "community-b": CommunityRole.COMMUNITY_MEMBER,
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
