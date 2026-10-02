import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGetCurrentUser, type getCurrentUser } from "../api/users/users";
import { useActiveCommunity } from "../context/community.context";
import { buildCurrentUser } from "./fixtures";
import { query } from "./queryState";
import { renderWithProviders } from "./renderWithProviders";

// A signed-in session is the GET /users/current query answering (#203), so the
// user is present on the first render rather than arriving in an effect.
vi.mock(import("../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCurrentUser: vi.fn(),
}));

function SingleMembershipUser() {
  const activeCommunityId = useActiveCommunity();
  return <span data-testid="community">{activeCommunityId ?? "none"}</span>;
}

// The second test never renders, so the reset-before-render cannot help it:
// only the harness's module-scope afterEach can leave storage empty for it.
// Both tests must pass in either order.
describe("harness afterEach storage cleanup", () => {
  beforeEach(() => {
    vi.mocked(useGetCurrentUser).mockReturnValue(
      query.success<typeof getCurrentUser>(
        buildCurrentUser({ id: "u1", memberships: { c1: "COMMUNITY_MEMBER" } }),
      ),
    );
  });

  it("a single-membership user makes the real CommunityProvider persist the selection", async () => {
    renderWithProviders(<SingleMembershipUser />);

    expect(await screen.findByText("c1")).toBeInTheDocument();
    // Precondition for the next test: the render really left storage behind.
    expect(window.localStorage.length).toBeGreaterThan(0);
  });

  it("leaves storage empty for a test that does not render", () => {
    expect(window.localStorage.length).toBe(0);
  });
});
