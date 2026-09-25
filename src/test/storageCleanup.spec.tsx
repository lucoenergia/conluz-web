import "@testing-library/jest-dom";
import { useEffect } from "react";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLoggedUserDispatch } from "../context/logged-user.context";
import { useActiveCommunity } from "../context/community.context";
import { buildUser } from "./fixtures";
import { renderWithProviders } from "./renderWithProviders";

function SingleMembershipLogin() {
  const setLoggedUser = useLoggedUserDispatch();
  const activeCommunityId = useActiveCommunity();

  useEffect(() => {
    setLoggedUser(buildUser({ id: "u1", memberships: { c1: "COMMUNITY_MEMBER" } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- log in once on mount
  }, []);

  return <span data-testid="community">{activeCommunityId ?? "none"}</span>;
}

// The second test never renders, so the reset-before-render cannot help it:
// only the harness's module-scope afterEach can leave storage empty for it.
// Both tests must pass in either order.
describe("harness afterEach storage cleanup", () => {
  it("a single-membership user makes the real CommunityProvider persist the selection", async () => {
    renderWithProviders(<SingleMembershipLogin />);

    expect(await screen.findByText("c1")).toBeInTheDocument();
    // Precondition for the next test: the render really left storage behind.
    expect(window.localStorage.length).toBeGreaterThan(0);
  });

  it("leaves storage empty for a test that does not render", () => {
    expect(window.localStorage.length).toBe(0);
  });
});
