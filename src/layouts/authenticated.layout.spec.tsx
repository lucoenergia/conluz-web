import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { useEffect, type FC } from "react";
import { Route, Routes, useParams } from "react-router";
import { renderWithProviders } from "../test/renderWithProviders";
import { query } from "../test/queryState";
import { useGetCurrentUser } from "../api/users/users";
import { AuthenticatedLayout } from "./authenticated.layout";
import { CommunityRole } from "../api/models";
import { buildUser } from "../test/fixtures";

const LOGGED_USER = buildUser({
  id: "user-1",
  fullName: "Ada",
  isPlatformAdmin: false,
  memberships: {
    "community-a": CommunityRole.COMMUNITY_ADMIN,
    "community-b": CommunityRole.COMMUNITY_ADMIN,
  },
});

vi.mock(import("../context/auth.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => "a-token",
}));

vi.mock(import("../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => LOGGED_USER,
  useLoggedUserDispatch: () => vi.fn(),
}));

vi.mock(import("../hooks/useLogout"), () => ({
  useLogout: () => vi.fn(),
}));

// The layout only calls this to bootstrap the user it already has, so with a
// logged user present the query is disabled (enabled: loggedUser === null).
vi.mock(import("../api/users/users"), () => ({
  useGetCurrentUser: vi.fn(),
}));

vi.mock("../components/Header/Header", () => ({
  Header: () => <div data-testid="header">header</div>,
}));

vi.mock("../components/Menu/SideMenu", () => ({
  SideMenu: () => <div data-testid="side-menu">side menu</div>,
}));

/**
 * Two separate records, because they answer two different questions.
 *
 * `renders` is pushed during render: it proves the foreign page was never even
 * rendered, which is what distinguishes a render-time redirect from an
 * effect-based one (the latter renders the page once, firing its queries,
 * before navigating away).
 *
 * `mounts` is pushed from a mount effect: it proves the Outlet key actually
 * remounts the component. A render-phase counter cannot tell a remount from a
 * plain re-render, and a context change re-renders everything regardless.
 */
const renders: string[] = [];
const mounts: string[] = [];

const PlantPage: FC = () => {
  const { plantId } = useParams();
  renders.push(`plant:${plantId}`);
  useEffect(() => {
    mounts.push(`plant:${plantId}`);
  }, [plantId]);
  return <div data-testid="plant-page">{plantId}</div>;
};

const PlantsListPage: FC = () => {
  renders.push("plants-list");
  useEffect(() => {
    mounts.push("plants-list");
  }, []);
  return <div data-testid="plants-list">plants list</div>;
};

function renderLayoutAt(initialEntry: string, communityId: string | null) {
  const { switchActiveCommunity } = renderWithProviders(
    <Routes>
      <Route element={<AuthenticatedLayout />}>
        <Route path="production">
          <Route index element={<PlantsListPage />} />
          <Route path=":plantId/sharing-agreements" element={<PlantPage />} />
        </Route>
      </Route>
    </Routes>,
    { route: initialEntry, activeCommunityId: communityId },
  );
  return { rerenderWith: (next: string | null) => switchActiveCommunity(next) };
}

describe("AuthenticatedLayout community switching", () => {
  beforeEach(() => {
    renders.length = 0;
    mounts.length = 0;
    vi.mocked(useGetCurrentUser).mockReturnValue(query.disabled());
  });

  it("never mounts the foreign entity page after a switch", () => {
    const { rerenderWith } = renderLayoutAt("/production/plant-a/sharing-agreements", "community-a");
    expect(screen.getByTestId("plant-page")).toHaveTextContent("plant-a");

    renders.length = 0;
    rerenderWith("community-b");

    expect(screen.getByTestId("plants-list")).toBeInTheDocument();
    expect(screen.queryByTestId("plant-page")).not.toBeInTheDocument();
    // The decisive assertion: had the redirect lived in an effect, the page
    // would have mounted once under the new community and fired its queries.
    expect(renders).not.toContain("plant:plant-a");
  });

  it("remounts the routed page when the community changes, so seeded state is cleared", () => {
    const { rerenderWith } = renderLayoutAt("/production", "community-a");
    expect(mounts).toEqual(["plants-list"]);

    rerenderWith("community-b");

    expect(mounts).toEqual(["plants-list", "plants-list"]);
  });

  it("keeps a deep link on first load, when the provider resolves the community from null", () => {
    const { rerenderWith } = renderLayoutAt("/production/plant-a/sharing-agreements", null);
    rerenderWith("community-a");

    expect(screen.getByTestId("plant-page")).toHaveTextContent("plant-a");
  });

  it("leaves the header and side menu mounted across a switch", () => {
    const { rerenderWith } = renderLayoutAt("/production", "community-a");
    rerenderWith("community-b");

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("side-menu")).toBeInTheDocument();
  });
});
