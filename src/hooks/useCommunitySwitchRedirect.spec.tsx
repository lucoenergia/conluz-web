import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { type FC, type ReactNode } from "react";
import { MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { ActiveCommunityContext } from "../context/community.context";
import type { CurrentUserResponse } from "../api/models";
import { buildCurrentUser } from "../test/fixtures";
import { useCommunitySwitchRedirect } from "./useCommunitySwitchRedirect";

// The caller's memberships tell a move they made from one they did not. Null
// -- not yet known -- is how the tests that are not about that run.
const loggedUser = vi.hoisted(() => ({ current: null as CurrentUserResponse | null }));
vi.mock(import("../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser.current,
}));

beforeEach(() => {
  loggedUser.current = null;
});

/** The caller after losing community-a: still a member of b and c. */
function memberOnlyOf(...communityIds: string[]): void {
  loggedUser.current = buildCurrentUser({
    memberships: Object.fromEntries(communityIds.map((id) => [id, "COMMUNITY_MEMBER"])),
  });
}

const Harness: FC = () => {
  const redirectTo = useCommunitySwitchRedirect();
  const { pathname, search } = useLocation();

  if (redirectTo) return <Navigate to={redirectTo} replace />;

  return (
    <div>
      <span data-testid="page">page mounted</span>
      <span data-testid="location">{`${pathname}${search}`}</span>
    </div>
  );
};

function expectLocation(expected: string): void {
  // Exact, not toHaveTextContent: that matches substrings, so "/production"
  // would happily pass while still sitting on "/production/plant-a".
  expect(screen.getByTestId("location").textContent).toBe(expected);
}

function renderAt(initialEntry: string, communityId: string | null): { rerenderWith: (next: string | null) => void } {
  const tree = (community: string | null): ReactNode => (
    <ActiveCommunityContext.Provider value={community}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    </ActiveCommunityContext.Provider>
  );

  const { rerender } = render(tree(communityId));
  return { rerenderWith: (next) => rerender(tree(next)) };
}

describe("useCommunitySwitchRedirect", () => {
  it("does not redirect on mount, even standing on a foreign-looking entity route", () => {
    renderAt("/production/plant-a/sharing-agreements/agreement-1", "community-a");

    expect(screen.getByTestId("page")).toBeInTheDocument();
    expectLocation("/production/plant-a/sharing-agreements/agreement-1");
  });

  // The provider starts at null and resolves the persisted / single-membership
  // community in an effect. Treating that as a switch would bounce every deep
  // link back to the section index on first load.
  it("does not redirect when the provider resolves the community from null on first load", () => {
    const { rerenderWith } = renderAt("/production/plant-a", null);
    rerenderWith("community-a");

    expectLocation("/production/plant-a");
  });

  it("redirects to the plants list when the community changes under a plant route", () => {
    const { rerenderWith } = renderAt("/production/plant-a/sharing-agreements/agreement-1", "community-a");
    rerenderWith("community-b");

    expectLocation("/production");
  });

  it("redirects to the supplies list when the community changes under a supply route", () => {
    const { rerenderWith } = renderAt("/supply-points/supply-a/edit", "community-a");
    rerenderWith("community-b");

    expectLocation("/supply-points");
  });

  // Losing the active community (a persisted id that is no longer a membership)
  // strands the user on the same foreign entity as a switch does.
  it("redirects when the community changes to null", () => {
    const { rerenderWith } = renderAt("/production/plant-a", "community-a");
    rerenderWith(null);

    expectLocation("/production");
  });

  it("stays put when the route is community-agnostic", () => {
    const { rerenderWith } = renderAt("/profile", "community-a");
    rerenderWith("community-b");

    expectLocation("/profile");
  });

  it("clears the pending redirect once it has landed, so the page mounts again", () => {
    const { rerenderWith } = renderAt("/production/plant-a", "community-a");
    rerenderWith("community-b");

    expect(screen.getByTestId("page")).toBeInTheDocument();
    expectLocation("/production");
  });

  it("redirects again on a second switch", () => {
    const { rerenderWith } = renderAt("/supply-points/supply-a", "community-a");
    rerenderWith("community-b");
    expectLocation("/supply-points");

    rerenderWith("community-c");
    expectLocation("/supply-points");
    expect(screen.getByTestId("page")).toBeInTheDocument();
  });
});

describe("useCommunitySwitchRedirect when the previous community was lost (#237)", () => {
  it("UI-ENT-007 sends a community page to the landing", () => {
    memberOnlyOf("community-a", "community-b");
    const { rerenderWith } = renderAt("/members", "community-a");

    memberOnlyOf("community-b");
    rerenderWith("community-b");

    expectLocation("/");
  });

  it("UI-ENT-007 sends a page about one of its plants to the landing, not to the plants list", () => {
    memberOnlyOf("community-a", "community-b");
    const { rerenderWith } = renderAt("/production/plant-a/sharing-agreements", "community-a");

    memberOnlyOf("community-b");
    rerenderWith("community-b");

    expectLocation("/");
  });

  it("UI-ENT-007 leaves a page that is not about a community where it is", () => {
    memberOnlyOf("community-a", "community-b");
    const { rerenderWith } = renderAt("/profile", "community-a");

    memberOnlyOf("community-b");
    rerenderWith("community-b");

    expectLocation("/profile");
  });

  it("UI-ENT-007 on the landing itself, stays there rather than redirecting to itself", () => {
    memberOnlyOf("community-a", "community-b");
    const { rerenderWith } = renderAt("/", "community-a");

    memberOnlyOf("community-b");
    rerenderWith("community-b");

    expect(screen.getByTestId("page")).toBeInTheDocument();
    expectLocation("/");
  });

  // The contrast: a switch the caller made keeps them on the page.
  it("UI-ENT-006 a switch the caller made leaves a community page where it is", () => {
    memberOnlyOf("community-a", "community-b");
    const { rerenderWith } = renderAt("/members", "community-a");
    rerenderWith("community-b");

    expectLocation("/members");
  });
});
