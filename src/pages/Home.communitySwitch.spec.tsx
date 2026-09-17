import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { type FC, type ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../theme";
import { ActiveCommunityContext } from "../context/community.context";
import { CommunityRole } from "../api/models";
import type { SupplyResponse, UserResponse } from "../api/models";

const SUPPLIES_BY_COMMUNITY: Record<string, SupplyResponse[]> = {
  "community-a": [{ id: "supply-a", name: "Supply A", address: "Street A" } as SupplyResponse],
  "community-b": [{ id: "supply-b", name: "Supply B", address: "Street B" } as SupplyResponse],
};

/** Every supply id the consumption/production panels actually requested. */
const requestedSupplyIds: string[] = [];

// The charts are irrelevant here and ApexCharts needs a ResizeObserver that
// jsdom does not provide.
vi.mock("../components/Graph/GraphBar", () => ({ GraphBar: () => <div /> }));
vi.mock("../components/Graph/MultiSeriesBar", () => ({ MultiSeriesBar: () => <div /> }));

vi.mock("../api/users/users", () => ({
  useGetSuppliesByUserId: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("../api/supplies/supplies", () => ({
  useGetAllSupplies: (communityId: string) => ({
    data: { items: SUPPLIES_BY_COMMUNITY[communityId] ?? [] },
    isLoading: false,
  }),
  useGetSupplyDailyProduction: (supplyId: string) => {
    if (supplyId) requestedSupplyIds.push(supplyId);
    return { data: undefined, isLoading: false };
  },
  useGetSupplyDailyConsumption: (supplyId: string) => {
    if (supplyId) requestedSupplyIds.push(supplyId);
    return { data: undefined, isLoading: false };
  },
}));

vi.mock("../context/logged-user.context", () => ({
  useLoggedUser: (): UserResponse =>
    ({
      id: "user-1",
      isPlatformAdmin: false,
      memberships: {
        "community-a": CommunityRole.COMMUNITY_ADMIN,
        "community-b": CommunityRole.COMMUNITY_ADMIN,
      },
    }) as unknown as UserResponse,
}));

import { HomePage } from "./Home";

/** Mirrors AuthenticatedLayout's keyed Outlet. */
const Keyed: FC<{ communityId: string }> = ({ communityId }) => (
  <ActiveCommunityContext.Provider value={communityId}>
    <HomePage key={communityId} />
  </ActiveCommunityContext.Provider>
);

function renderHome(communityId: string) {
  const tree = (id: string): ReactNode => (
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Keyed communityId={id} />
      </MemoryRouter>
    </ThemeProvider>
  );
  const { rerender } = render(tree(communityId));
  return { switchTo: (id: string) => rerender(tree(id)) };
}

describe("HomePage across a community switch", () => {
  beforeEach(() => {
    requestedSupplyIds.length = 0;
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
