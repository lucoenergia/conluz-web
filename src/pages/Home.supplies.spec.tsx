import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { query } from "../test/queryState";
import { buildCurrentUser, buildSupply } from "../test/fixtures";
import { CommunityRole } from "../api/models";
import type { CurrentUserResponse } from "../api/models";
import {
  useGetAllSupplies,
  useGetSupplyDailyConsumption,
  useGetSupplyDailyProduction,
  type getAllSupplies,
} from "../api/supplies/supplies";

/**
 * The home supply picker does not decide who sees what.
 *
 * It used to: it read the platform flag and the active-community role, and
 * sent members to GET /users/{userId}/supplies and admins to
 * GET /communities/{id}/supplies. The community endpoint already answers both
 * -- "Community admins of the community see all of its supplies. Regular
 * members see only the supplies they own within the community." -- and the
 * per-user one answered a different question entirely, with no community
 * predicate at all.
 *
 * So what these tests assert is an absence: every persona reaches the same
 * query, with the same arguments, and the screen has no branch left to get
 * wrong.
 */

const COMMUNITY_ID = "community-1";

const SUPPLIES = [
  buildSupply({ id: "supply-1", name: "Supply One", address: "Street One" }),
  buildSupply({ id: "supply-2", name: "Supply Two", address: "Street Two" }),
];

let loggedUser: CurrentUserResponse;

// The charts are irrelevant here and ApexCharts needs a ResizeObserver that
// jsdom does not provide.
vi.mock("../components/Graph/GraphBar", () => ({ GraphBar: () => <div /> }));
vi.mock("../components/Graph/MultiSeriesBar", () => ({ MultiSeriesBar: () => <div /> }));

vi.mock(import("../api/supplies/supplies"), () => ({
  useGetAllSupplies: vi.fn(),
  useGetSupplyDailyProduction: vi.fn(),
  useGetSupplyDailyConsumption: vi.fn(),
}));

vi.mock(import("../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser,
}));

import { HomePage } from "./Home";

const PERSONAS: [string, CurrentUserResponse][] = [
  [
    "a plain member",
    buildCurrentUser({
      id: "user-member",
      isPlatformAdmin: false,
      memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_MEMBER },
    }),
  ],
  [
    "a community admin",
    buildCurrentUser({
      id: "user-admin",
      isPlatformAdmin: false,
      memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_ADMIN },
    }),
  ],
  [
    // The golden rule: the flag buys nothing inside a community. They are here
    // as an ordinary member of it, and the screen must treat them as one.
    "a platform admin who is a plain member",
    buildCurrentUser({
      id: "user-platform",
      isPlatformAdmin: true,
      memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_MEMBER },
    }),
  ],
];

describe("the home supply picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAllSupplies).mockReturnValue(
      query.success<typeof getAllSupplies>({ items: SUPPLIES }),
    );
    vi.mocked(useGetSupplyDailyProduction).mockReturnValue(query.loading());
    vi.mocked(useGetSupplyDailyConsumption).mockReturnValue(query.loading());
  });

  it.each(PERSONAS)("lists the community's answer for %s", async (_name, user) => {
    loggedUser = user;
    renderWithProviders(<HomePage />, { activeCommunityId: COMMUNITY_ID });

    await waitFor(() => {
      expect(screen.getByLabelText("Puntos de suministro")).toHaveValue("Supply One - Street One");
    });

    // Same endpoint, same community, enabled -- for all three.
    expect(vi.mocked(useGetAllSupplies).mock.calls[0][0]).toBe(COMMUNITY_ID);
    expect(vi.mocked(useGetAllSupplies).mock.calls[0][2]?.query?.enabled).toBe(true);
  });

  it("asks nothing until there is a community to ask about", () => {
    loggedUser = buildCurrentUser({
      id: "user-many",
      isPlatformAdmin: false,
      memberships: {
        "community-1": CommunityRole.COMMUNITY_MEMBER,
        "community-2": CommunityRole.COMMUNITY_MEMBER,
      },
    });
    vi.mocked(useGetAllSupplies).mockReturnValue(query.disabled());

    // Two memberships and nothing persisted: CommunityProvider resolves to none
    // and waits for the user to pick.
    renderWithProviders(<HomePage />, { activeCommunityId: null });

    expect(vi.mocked(useGetAllSupplies).mock.calls[0][2]?.query?.enabled).toBe(false);
    expect(screen.getByLabelText("Puntos de suministro")).toHaveValue("");
  });
});
