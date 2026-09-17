import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { type FC, type ReactNode } from "react";
import { MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { ActiveCommunityContext } from "../context/community.context";
import { useCommunitySwitchRedirect } from "./useCommunitySwitchRedirect";

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
