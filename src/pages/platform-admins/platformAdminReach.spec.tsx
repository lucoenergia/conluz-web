import "@testing-library/jest-dom";
import type { FC } from "react";
import { act, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import App from "../../App";
import { CommunityRole } from "../../hooks/permissions";
import { createAppQueryClient } from "../../queryClient";
import {
  buildCommunity,
  buildCommunityAdmin,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildPlatformAdmin,
  buildPlatformCapabilities,
  buildUser,
} from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";

/**
 * What a platform admin with no membership can still reach, against the real
 * route table in App.tsx (#285): the communities, their admins, the platform
 * admins and their own account -- and no member's data.
 *
 * Tier 2: the subject is which requests the routed screens send, so the
 * production query client, the route guards and the generated hooks run, and
 * only the transport is replaced.
 *
 * The user list and a user's record are served with a member's data on
 * purpose. A screen that asked for them would show it, so asserting that the
 * member's name never appears says something; with nothing to show, it would
 * pass whatever the screens did.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY_ID = "community-1";
const COMMUNITY_NAME = "Comunidad Solar";

/**
 * Everything the backend still reports to a platform admin, including a
 * capability the web client no longer reads (canListUsers): the screens must
 * stay away from users whatever the payload says.
 */
const PLATFORM_ADMIN = buildCurrentUser({
  id: "u-paula",
  fullName: "Paula Plataforma",
  isPlatformAdmin: true,
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({
    canAdministerPlatform: true,
    canCreateCommunity: true,
    canListPlatformAdmins: true,
    canListUsers: true,
  }),
});

/** A community as a platform admin sees it: administered, without being a member. */
const COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: COMMUNITY_NAME,
  code: "SOL",
  enabled: true,
  adminNames: ["Rosa Admin"],
  memberCount: 12,
  supplyPointCount: 14,
  capabilities: buildCommunityCapabilities({ canRead: true, canUpdate: true, canManageAdmins: true }),
});

const COMMUNITY_ADMIN = buildCommunityAdmin({
  user: { id: "u-rosa" },
  fullName: "Rosa Admin",
  acceptedAt: "2026-02-01T09:00:00Z",
  invitedAt: "2026-01-25T09:00:00Z",
});

const PLATFORM_ADMINS = [
  buildPlatformAdmin({ user: { id: "u-paula" }, fullName: "Paula Plataforma", email: "paula@example.com" }),
];

/** A member of the community: what the platform admin must never be shown. */
const MEMBER_NAME = "Mario Miembro";
const MEMBER_PERSONAL_ID = "MARIO-DNI-0001";
const MEMBER = buildUser({ id: "u-mario", fullName: MEMBER_NAME, personalId: MEMBER_PERSONAL_ID });

/** Every request a screen could send for a member's data. */
const MEMBER_DATA = [
  /^\/api\/v1\/users(\?|$)/,
  /^\/api\/v1\/users\/(?!current($|\/))[^/]+/,
  /\/memberships(\/|$|\?)/,
  /\/supplies(\/|$|\?)/,
  /\/plants(\/|$|\?)/,
  /\/consumption(\/|$|\?)/,
  /\/production(\/|$|\?)/,
  /\/investment(\/|$|\?)/,
  /\/payback(\/|$|\?)/,
];

const isMemberData = (config: RequestConfig) => MEMBER_DATA.some((pattern) => pattern.test(config.url ?? ""));

function servePlatformAdmin(): RequestRouter {
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => PLATFORM_ADMIN },
    { method: "GET", url: "/api/v1/communities", respond: () => [COMMUNITY] },
    { method: "GET", url: `/api/v1/communities/${COMMUNITY_ID}`, respond: () => COMMUNITY },
    { method: "GET", url: `/api/v1/communities/${COMMUNITY_ID}/admins`, respond: () => [COMMUNITY_ADMIN] },
    // The community's contact channels, which a platform admin may read (#295).
    // Not member data: they are what the community publishes to its members.
    { method: "GET", url: `/api/v1/communities/${COMMUNITY_ID}/contact`, respond: () => ({ channels: [] }) },
    { method: "GET", url: "/api/v1/platform-admins", respond: () => PLATFORM_ADMINS },
    // Served, so a screen that asked would show the member (see above).
    { method: "GET", url: /^\/api\/v1\/users(\?|$)/, respond: () => ({ items: [MEMBER], totalElements: 1 }) },
    { method: "GET", url: /^\/api\/v1\/users\/(?!current$)[^/]+$/, respond: () => MEMBER },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const PathOutput: FC = () => <output aria-label="path">{useLocation().pathname}</output>;

/** The production client and handlers, minus retries, so a failure is final at once. */
function appClientWithoutRetries(): QueryClient {
  const client = createAppQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
    mutations: { ...defaults.mutations, retry: false },
  });
  return client;
}

function renderAppAt(url: string) {
  window.history.replaceState(null, "", url);
  return renderWithProviders(
    <>
      <App />
      <PathOutput />
    </>,
    { browserHistory: true, token: "a-token", queryClient: appClientWithoutRetries() },
  );
}

const currentPath = () => screen.getByRole("status", { name: "path" }).textContent;

/** Lets every pending query, effect and lazy mount run, so a request that is coming has been sent. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 100)));

/** No request for member data was sent, and none of it is on screen. */
function expectNoMemberData(router: RequestRouter) {
  expect(router.requests.filter(isMemberData).map((r) => `${(r.method ?? "GET").toUpperCase()} ${r.url}`)).toEqual(
    [],
  );
  expect(screen.queryByText(new RegExp(MEMBER_NAME))).not.toBeInTheDocument();
  expect(screen.queryByText(new RegExp(MEMBER_PERSONAL_ID))).not.toBeInTheDocument();
}

// App.tsx loads every page on demand; loading the ones under test up front
// keeps a test from paying its transform inside its own timeout.
beforeAll(async () => {
  await Promise.all([
    import("../platform/PlatformPage"),
    import("../communities/CommunitiesPage"),
    import("../communities/CreateCommunityPage"),
    import("../communities/EditCommunityPage"),
    import("../communities/CommunityAdminsPage"),
    import("./PlatformAdminsPage"),
    import("../Profile"),
    import("../auth/ChangePassword"),
    import("../not-found/NotFoundPage"),
    import("../landing/LandingRoute"),
    import("../supply-points/SupplyPointsPage"),
    import("../supply-points/SupplyDetailPage"),
    import("../supply-points/EditSupply"),
    import("../production/PlantsPage"),
    import("../production/PlantDetailPage"),
  ]);
}, 60_000);

beforeEach(() => {
  mockCustomInstance.mockReset();
});

describe("a platform admin with no membership", () => {
  it.each<[string, string, string]>([
    ["the platform overview", "/platform", "Administración de plataforma"],
    ["the communities", "/communities", "Gestión de Comunidades"],
    ["creating a community", "/communities/new", "Crear nueva comunidad"],
    ["editing a community", `/communities/${COMMUNITY_ID}/edit`, "Editar comunidad"],
    ["a community's admins", `/communities/${COMMUNITY_ID}/admins`, `Administradores de ${COMMUNITY_NAME}`],
    ["the platform admins", "/platform-admins", "Administradores de plataforma"],
    ["their profile", "/profile", "Mi perfil"],
    ["their password change", "/change-password", "Cambiar contraseña"],
  ])("UI-PAD-008 keeps %s, and it sends no request for member data", async (_, path, heading) => {
    const router = servePlatformAdmin();
    renderAppAt(path);

    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    await settle();

    expect(currentPath()).toBe(path);
    expectNoMemberData(router);
    expect(router.takeUnmatched()).toEqual([]);
  });

  // Each of these was open to any signed-in caller, and sent the requests in
  // the comment for a platform admin who opened it by URL.
  it.each<[string, string]>([
    // GET /users/{personId}
    ["a member's supplies", "/supply-points?personId=u-mario"],
    // GET /supplies/{id} and every consumption query
    ["a supply", "/supply-points/supply-1"],
    // GET /supplies/{id}, then GET /users from the form
    ["editing a supply", "/supply-points/supply-1/edit"],
    ["the plants", "/production"],
    // GET /plants/{id}
    ["a plant", "/production/plant-1"],
  ])("UI-PAD-008 cannot open %s by URL, and is sent to the platform overview", async (_, url) => {
    const router = servePlatformAdmin();
    renderAppAt(url);

    await waitFor(() => expect(currentPath()).toBe("/platform"));
    expect(await screen.findByRole("heading", { level: 1, name: "Administración de plataforma" })).toBeInTheDocument();
    await settle();

    expectNoMemberData(router);
    expect(router.takeUnmatched()).toEqual([]);
  });

  it("UI-PAD-008 is offered no menu entry to a member screen or to users", async () => {
    servePlatformAdmin();
    renderAppAt("/platform");
    await screen.findByRole("heading", { level: 1, name: "Administración de plataforma" });

    const platformSection = await screen.findByRole("list", { name: "Plataforma" });
    expect(platformSection).toHaveTextContent("Comunidades");
    expect(platformSection).toHaveTextContent("Administradores de plataforma");
    for (const label of ["Usuarios", "Miembros", "Mi consumo y ahorro", "Puntos de suministro", "Producción", "Integraciones"]) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });
});

describe("the removed users pages", () => {
  it.each(["/users", "/users/new", "/users/u-mario/edit"])(
    "UI-ROUTE-001 renders the not-found page at %s, not the old screen",
    async (url) => {
      const router = servePlatformAdmin();
      renderAppAt(url);

      expect(await screen.findByRole("heading", { level: 1, name: "Esta página no existe" })).toBeInTheDocument();
      await settle();

      expect(currentPath()).toBe(url);
      expect(screen.queryByRole("heading", { name: /usuario/i })).not.toBeInTheDocument();
      expectNoMemberData(router);
      expect(router.takeUnmatched()).toEqual([]);
    },
  );
});

/**
 * The guard on the supply-points and production subtrees asks the active
 * community's canRead, which a member and a community admin hold. Their
 * screens' own data is not served here: what is under test is that the guard
 * lets them through, so the requests the pages send are taken, not asserted.
 */
describe("a member of the community", () => {
  const MEMBER_VIEW = buildCommunity({
    id: COMMUNITY_ID,
    name: COMMUNITY_NAME,
    capabilities: buildCommunityCapabilities({ canRead: true, canListPlants: true, canListSupplies: true }),
  });

  it.each([
    ["a member", CommunityRole.COMMUNITY_MEMBER],
    ["a community admin", CommunityRole.COMMUNITY_ADMIN],
  ])("still reaches the supplies and the plants as %s", async (_, role) => {
    const caller = buildCurrentUser({ id: "u-ana", fullName: "Ana Socia", memberships: { [COMMUNITY_ID]: role } });

    for (const path of ["/supply-points", "/supply-points/supply-1", "/production", "/production/plant-1"]) {
      const router = routeRequests([
        { method: "GET", url: "/api/v1/users/current", respond: () => caller },
        { method: "GET", url: "/api/v1/communities", respond: () => [MEMBER_VIEW] },
        { method: "GET", url: `/api/v1/communities/${COMMUNITY_ID}`, respond: () => MEMBER_VIEW },
      ]);
      mockCustomInstance.mockImplementation(router.handle);
      const { unmount } = renderAppAt(path);

      // The page's own first request is what the guard let through.
      await waitFor(() => expect(router.requests.some(isMemberData)).toBe(true));
      expect(currentPath()).toBe(path);

      unmount();
      router.takeUnmatched();
    }
  });
});
