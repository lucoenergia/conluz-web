import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../test/renderWithProviders";
import { query } from "../test/queryState";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser } from "../test/fixtures";
import { useGetCurrentUser } from "../api/users/users";
import {
  useGetAllCommunities,
  useGetCommunityById,
  type getAllCommunities,
  type getCommunityById,
} from "../api/communities/communities";
import { CommunityRole, type CurrentUserResponse } from "../api/models";
import { AuthenticatedLayout } from "./authenticated.layout";

let loggedUser: CurrentUserResponse;

vi.mock(import("../context/auth.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => "a-token",
}));

vi.mock(import("../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser,
}));

vi.mock(import("../hooks/useLogout"), () => ({
  useLogout: () => vi.fn(),
}));

vi.mock(import("../api/users/users"), () => ({
  useGetCurrentUser: vi.fn(),
}));

// The layout reads the active community's capabilities from
// useGetCommunityById, so it is mocked too: left real, it reached the network
// (#211). The spread keeps the rest of the module real.
vi.mock(import("../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
  useGetCommunityById: vi.fn(),
}));

const COMMUNITY_NAME = "Comunidad Alpha";
const SCOPE = { name: "Ámbito de la página" } as const;
const originalWidth = window.innerWidth;

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
}

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route element={<AuthenticatedLayout />}>
        <Route index element={<p>Página de inicio</p>} />
        {/* Where a community member lands from "/", as in App.tsx. */}
        <Route path="home" element={<p>Inicio de la comunidad</p>} />
        <Route path="production" element={<p>Página de producción</p>} />
        <Route path="users" element={<p>Página de usuarios</p>} />
        <Route path="profile" element={<p>Página de perfil</p>} />
        <Route path="no-community" element={<p>Sin comunidad</p>} />
      </Route>
    </Routes>,
    { route, activeCommunityId: "community-a" },
  );
}

const navigation = () => screen.getByRole("navigation", { name: "Navegación principal" });

beforeEach(() => {
  loggedUser = buildCurrentUser({
    id: "user-1",
    fullName: "Ada",
    isPlatformAdmin: true,
    memberships: { "community-a": CommunityRole.COMMUNITY_ADMIN, "community-b": CommunityRole.COMMUNITY_MEMBER },
  });
  vi.mocked(useGetCurrentUser).mockReturnValue(query.disabled());
  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>([
      buildCommunity({ id: "community-a", name: COMMUNITY_NAME }),
      buildCommunity({ id: "community-b", name: "Comunidad Beta" }),
    ]),
  );
  // What community-a answers its admin.
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: "community-a",
        name: COMMUNITY_NAME,
        capabilities: buildCommunityCapabilities({ canRead: true, canManage: true, canManageMemberships: true }),
      }),
    ),
  );
});

afterEach(() => setViewportWidth(originalWidth));

describe("AuthenticatedLayout — the page scope is stated exactly once (AC4)", () => {
  test("AC1: desktop with the menu open states the community in the menu header and renders no strip", () => {
    setViewportWidth(1440);
    renderAt("/production");

    const surfaces = screen.getAllByRole("region", SCOPE);
    expect(surfaces).toHaveLength(1);
    expect(navigation()).toContainElement(surfaces[0]);
    expect(within(surfaces[0]).getByText("Comunidad activa")).toBeInTheDocument();
    expect(screen.getAllByText(COMMUNITY_NAME)).toHaveLength(1);
  });

  test("AC2: closing the menu moves the statement to a strip under the app bar, with the switch control", async () => {
    const user = userEvent.setup();
    setViewportWidth(1440);
    renderAt("/production");

    await user.click(screen.getByRole("button", { name: "menu" }));

    const surfaces = screen.getAllByRole("region", SCOPE);
    expect(surfaces).toHaveLength(1);
    expect(screen.getByRole("main")).toContainElement(surfaces[0]);
    expect(within(surfaces[0]).getByRole("button", { name: /Comunidad activa: Comunidad Alpha/ })).toBeInTheDocument();
    expect(screen.getAllByText(COMMUNITY_NAME)).toHaveLength(1);
  });

  test("AC3: below the desktop breakpoint the strip shows without opening the menu", () => {
    setViewportWidth(390);
    renderAt("/");

    const surfaces = screen.getAllByRole("region", SCOPE);
    expect(surfaces).toHaveLength(1);
    expect(screen.getByRole("main")).toContainElement(surfaces[0]);
    expect(within(surfaces[0]).getByText(COMMUNITY_NAME)).toBeInTheDocument();
  });

  test("AC3: opening the menu on a narrow viewport moves the statement into it", async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    renderAt("/");

    await user.click(screen.getByRole("button", { name: "menu" }));

    const surfaces = screen.getAllByRole("region", SCOPE);
    expect(surfaces).toHaveLength(1);
    expect(navigation()).toContainElement(surfaces[0]);
  });

  test.each([
    ["/users", "Toda la plataforma"],
    ["/profile", "Tu cuenta"],
  ])("%s states '%s' once, in either menu state, and never the community", async (route, statement) => {
    const user = userEvent.setup();
    setViewportWidth(1440);
    renderAt(route);

    expect(screen.getAllByRole("region", SCOPE)).toHaveLength(1);
    expect(screen.getAllByText(statement)).toHaveLength(1);
    expect(screen.queryByText(COMMUNITY_NAME)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "menu" }));

    expect(screen.getAllByRole("region", SCOPE)).toHaveLength(1);
    expect(screen.getAllByText(statement)).toHaveLength(1);
  });

  test("/no-community renders no scope surface in either menu state", async () => {
    const user = userEvent.setup();
    setViewportWidth(1440);
    renderAt("/no-community");

    expect(screen.queryByRole("region", SCOPE)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "menu" }));
    expect(screen.queryByRole("region", SCOPE)).not.toBeInTheDocument();
  });
});
