import "@testing-library/jest-dom";
import type { FC } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { AuthenticatedLayout } from "../../layouts/authenticated.layout";
import { useMembershipActions } from "../../hooks/actions";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildMembership,
  buildMembershipCapabilities,
  buildUser,
} from "../../test/fixtures";
import { CommunityRole, type CurrentUserResponse } from "../../api/models";

/**
 * The one case where an in-app action changes the caller's OWN record.
 *
 * `DELETE /communities/{id}/memberships/{userId}` is gated on
 * `canManageMemberships(communityId)` and has no self rail -- unlike the
 * platform-admin flag -- so a community admin can remove their own membership.
 * Their memberships live on the current user, which is what the community
 * selector offers and the role label reads, so the write has to invalidate that
 * key or the caller keeps being offered a community they have just left (#203).
 *
 * Tier 2: the subject is whether the invalidation actually refetches. The real
 * action hook, a real QueryClient and the real LoggedUserProvider run; only the
 * HTTP layer is mocked.
 *
 * NOTE on what this assumes: that self-removal is permitted, which is today's
 * backend behaviour. If a self rail is added (it would stop a community being
 * left with no administrator at all), this spec is the one to revisit -- it is
 * not the specification.
 */
const COMMUNITY_ID = "community-1";
const USER_ID = "user-1";
const CURRENT_USER_URL = "/api/v1/users/current";
const ALL_COMMUNITIES_URL = "/api/v1/communities";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const MEMBERSHIP_URL = `${COMMUNITY_URL}/memberships/${USER_ID}`;

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: "Comunidad Solar",
  capabilities: buildCommunityCapabilities({ canRead: true, canManageMemberships: true }),
});

const ADMIN_OF_ONE = buildCurrentUser({
  id: USER_ID,
  fullName: "Ada",
  memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_ADMIN },
});
const MEMBER_OF_NONE: CurrentUserResponse = { ...ADMIN_OF_ONE, memberships: {} };

const OWN_MEMBERSHIP = buildMembership({
  id: "membership-1",
  communityId: COMMUNITY_ID,
  role: CommunityRole.COMMUNITY_ADMIN,
  user: buildUser({ id: USER_ID, fullName: "Ada" }),
  capabilities: buildMembershipCapabilities({ canDelete: true }),
});

const LeaveButton: FC = () => {
  const { actions } = useMembershipActions(COMMUNITY).forMembership(OWN_MEMBERSHIP);
  return actions.remove ? (
    <button onClick={() => void actions.remove?.run()}>Salir de la comunidad</button>
  ) : null;
};

describe("removing one's own membership", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("stops offering the community, without a reload", async () => {
    const user = userEvent.setup();
    let currentUserServed = 0;
    const router = routeRequests([
      {
        method: "GET",
        url: CURRENT_USER_URL,
        respond: () => {
          currentUserServed += 1;
          return currentUserServed === 1 ? ADMIN_OF_ONE : MEMBER_OF_NONE;
        },
      },
      { method: "GET", url: ALL_COMMUNITIES_URL, respond: () => [COMMUNITY] },
      { method: "GET", url: COMMUNITY_URL, respond: () => COMMUNITY },
      { method: "GET", url: new RegExp(`${COMMUNITY_URL}/memberships$`), respond: () => [OWN_MEMBERSHIP] },
      { method: "DELETE", url: MEMBERSHIP_URL, respond: () => undefined },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route index element={<LeaveButton />} />
        </Route>
      </Routes>,
      { route: "/", activeCommunityId: COMMUNITY_ID, token: "a-token" },
    );

    // The header's community selector names the one community they belong to.
    expect(await screen.findByText("Comunidad Solar")).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Salir de la comunidad" }));

    await waitFor(() => expect(router.requests.some((r) => r.method === "DELETE")).toBe(true));
    // The write refetched the caller, not just the roster.
    await waitFor(() => expect(currentUserServed).toBe(2));
    await waitFor(() => expect(screen.queryByText("Comunidad Solar")).not.toBeInTheDocument());
  });
});
