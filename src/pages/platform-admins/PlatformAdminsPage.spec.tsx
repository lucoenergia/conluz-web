import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestRouter } from "../../test/requestRouter";
import {
  buildCurrentUser,
  buildPlatformAdmin,
  buildPlatformAdminCapabilities,
  buildPlatformCapabilities,
  buildPlatformCapabilitiesWithout,
} from "../../test/fixtures";
import type {
  CurrentUserResponse,
  PlatformAdminResponse,
  PlatformCapabilitiesResponse,
  RestErrorDetailCode,
} from "../../api/models";
import { CapabilityRoute } from "../../components/Auth/CapabilityRoute";
import { PlatformAdminsPage } from "./PlatformAdminsPage";

/**
 * The platform admins page against routed requests (#285).
 *
 * Tier 2: the real generated hooks, actions layer and QueryClient run, and only
 * the HTTP layer is mocked, so a test sees each request the page sends and the
 * list it shows once a revoke has refetched it. The routes cover the current
 * user, the platform admins and the revoke, and nothing else: a request for
 * users, a user or a roster matches no route and fails the test.
 */
const { mockCustomInstance, mockErrorDispatch } = vi.hoisted(() => ({
  mockCustomInstance: vi.fn(),
  mockErrorDispatch: vi.fn(),
}));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

// The page's failure slot is the layout's toast, which is not rendered here;
// what the page dispatches to it is what these tests read.
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

const CURRENT_USER_URL = "/api/v1/users/current";
const PLATFORM_ADMINS_URL = "/api/v1/platform-admins";
const revokeUrl = (userId: string) => `/api/v1/users/${userId}/revoke-platform-admin`;

const CALLER = buildCurrentUser({
  id: "u-paula",
  fullName: "Paula Plataforma",
  isPlatformAdmin: true,
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true, canListPlatformAdmins: true }),
});

const REVOCABLE = { revocable: true, capabilities: buildPlatformAdminCapabilities({ canRevoke: true }) };

// The caller's own row: they may not revoke themselves.
const PAULA = buildPlatformAdmin({
  user: { id: "u-paula" },
  fullName: "Paula Plataforma",
  email: "paula@example.com",
  revocable: true,
});
const RAMON = buildPlatformAdmin({ user: { id: "u-ramon" }, fullName: "Ramón Revocable", email: "ramon@example.com", ...REVOCABLE });
const DIANA = buildPlatformAdmin({
  user: { id: "u-diana" },
  fullName: "Diana Deshabilitada",
  email: "diana@example.com",
  enabled: false,
  ...REVOCABLE,
});
// The caller may revoke them, but the platform would not accept it now.
const ULISES = buildPlatformAdmin({
  user: { id: "u-ulises" },
  fullName: "Ulises Último",
  email: null,
  revocable: false,
  capabilities: buildPlatformAdminCapabilities({ canRevoke: true }),
});

type Admins = { current: PlatformAdminResponse[] };

function servePage(
  admins: Admins,
  { revoke, caller = CALLER }: { revoke?: (userId: string) => unknown; caller?: CurrentUserResponse } = {},
): RequestRouter {
  const router = routeRequests([
    { method: "GET", url: CURRENT_USER_URL, respond: () => caller },
    { method: "GET", url: PLATFORM_ADMINS_URL, respond: () => admins.current },
    {
      method: "POST",
      url: /^\/api\/v1\/users\/[^/]+\/revoke-platform-admin$/,
      respond: (config) => {
        if (!revoke) throw new Error("unexpected revoke");
        return revoke(config.url?.split("/")[4] ?? "");
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const listReads = (router: RequestRouter) => router.requests.filter((r) => r.url === PLATFORM_ADMINS_URL).length;
const writeLines = (router: RequestRouter) =>
  router.requests
    .filter((r) => (r.method ?? "GET").toUpperCase() !== "GET")
    .map((r) => `${(r.method ?? "GET").toUpperCase()} ${r.url}`);

/** An API refusal as Axios rejects with it: status and the RestError body. */
function restError(status: number, code?: RestErrorDetailCode) {
  const errors = code ? [{ message: "refused", code }] : [];
  return { response: { status, headers: {}, data: { status, message: "refused", errors } } };
}

/** The page under its real route guard, as App.tsx mounts it; a denial lands on "/". */
const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<p>Página de inicio</p>} />
      <Route
        path="/platform-admins"
        element={
          <CapabilityRoute require={{ scope: "platform", capability: "canListPlatformAdmins" }}>
            <PlatformAdminsPage />
          </CapabilityRoute>
        }
      />
    </Routes>,
    { route: "/platform-admins", token: "a-token", activeCommunityId: null },
  );

const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;
const actionsButton = (name: string) => screen.queryByRole("button", { name: `Más acciones para ${name}` });

async function openMenuOf(u: ReturnType<typeof userEvent.setup>, name: string) {
  await u.click(screen.getByRole("button", { name: `Más acciones para ${name}` }));
  return screen.findByRole("menu");
}

/** Picks "Revocar rol" from the row's menu and confirms in the dialog it opens. */
async function revokeFromMenu(u: ReturnType<typeof userEvent.setup>, name: string) {
  const menu = await openMenuOf(u, name);
  await u.click(within(menu).getByRole("menuitem", { name: "Revocar rol" }));
  const dialog = await screen.findByRole("dialog", { name: "Revocar rol de administrador de plataforma" });
  expect(within(dialog).getByText(name)).toBeInTheDocument();
  await u.click(within(dialog).getByRole("button", { name: "Revocar rol" }));
}

const originalWidth = window.innerWidth;
const setViewportWidth = (width: number) =>
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });

beforeEach(() => {
  mockCustomInstance.mockReset();
  mockErrorDispatch.mockReset();
});

afterEach(() => setViewportWidth(originalWidth));

describe("who may see it", () => {
  it.each<[string, Partial<PlatformCapabilitiesResponse>]>([
    ["without canListPlatformAdmins", { canAdministerPlatform: true, canListPlatformAdmins: false }],
  ])("UI-PAD-001 sends a caller %s home, without asking for the list", async (_, capabilities) => {
    const router = servePage(
      { current: [RAMON] },
      { caller: buildCurrentUser({ platformCapabilities: buildPlatformCapabilities(capabilities) }) },
    );
    renderPage();

    expect(await screen.findByText("Página de inicio")).toBeInTheDocument();
    expect(listReads(router)).toBe(0);
  });

  // A backend that predates the capability sends no key at all.
  it("UI-PAD-001 sends a caller home when the backend does not report the capability", async () => {
    const router = servePage(
      { current: [RAMON] },
      {
        caller: buildCurrentUser({
          platformCapabilities: buildPlatformCapabilitiesWithout("canListPlatformAdmins", { canAdministerPlatform: true }),
        }),
      },
    );
    renderPage();

    expect(await screen.findByText("Página de inicio")).toBeInTheDocument();
    expect(listReads(router)).toBe(0);
  });
});

describe("the list", () => {
  it("UI-PAD-002 shows each platform admin's name, email and state, from the platform-admins endpoint only", async () => {
    const router = servePage({ current: [PAULA, RAMON, DIANA] });
    renderPage();

    expect(await screen.findByText("Ramón Revocable")).toBeInTheDocument();
    const ramon = within(rowOf("Ramón Revocable"));
    expect(ramon.getByText("ramon@example.com")).toBeInTheDocument();
    expect(ramon.getByText("Habilitado")).toBeInTheDocument();
    const diana = within(rowOf("Diana Deshabilitada"));
    expect(diana.getByText("diana@example.com")).toBeInTheDocument();
    expect(diana.getByText("Deshabilitado")).toBeInTheDocument();
    expect(within(rowOf("Paula Plataforma")).getByText("paula@example.com")).toBeInTheDocument();

    expect(router.requests.map((r) => r.url)).toEqual(
      expect.arrayContaining([CURRENT_USER_URL, PLATFORM_ADMINS_URL]),
    );
    expect(new Set(router.requests.map((r) => r.url))).toEqual(new Set([CURRENT_USER_URL, PLATFORM_ADMINS_URL]));
  });

  it("UI-PAD-002 shows a platform admin without email by name alone", async () => {
    servePage({ current: [ULISES] });
    renderPage();

    await screen.findByText("Ulises Último");
    const [name, email] = within(rowOf("Ulises Último")).getAllByRole("cell");
    // The avatar's initial, then the name, with nothing after it.
    expect(name).toHaveTextContent(/^UUlises Último$/);
    expect(email).toHaveTextContent(/^$/);
  });

  it("UI-PAD-002 gives a platform admin without email no email line in the narrow list", async () => {
    setViewportWidth(390);
    servePage({ current: [RAMON, ULISES] });
    renderPage();

    const list = await screen.findByRole("list", { name: "Administradores de plataforma" });
    expect(within(list).getByText("ramon@example.com")).toBeInTheDocument();
    const ulises = within(list).getByText("Ulises Último").closest("li") as HTMLElement;
    expect(within(ulises).queryByText("Email")).not.toBeInTheDocument();
    expect(within(ulises).queryByText(/@/)).not.toBeInTheDocument();
  });

  it("UI-PAD-007 reads nothing about users, members or rosters", async () => {
    const router = servePage({ current: [PAULA, RAMON] });
    renderPage();
    await screen.findByText("Ramón Revocable");

    const urls = router.requests.map((r) => r.url ?? "");
    expect(urls.filter((url) => url.includes("/memberships") || url.includes("/communities"))).toEqual([]);
    expect(urls.filter((url) => url.startsWith("/api/v1/users") && url !== CURRENT_USER_URL)).toEqual([]);
  });
});

describe("revoking the role", () => {
  it("UI-PAD-003 offers no row action on the caller's own row", async () => {
    servePage({ current: [PAULA, RAMON] });
    renderPage();
    await screen.findByText("Paula Plataforma");

    expect(actionsButton("Paula Plataforma")).not.toBeInTheDocument();
    expect(actionsButton("Ramón Revocable")).toBeInTheDocument();
  });

  it("UI-PAD-004 shows Revocar rol disabled, with the reason, on a row the platform would not accept", async () => {
    const u = userEvent.setup();
    const router = servePage({ current: [ULISES] }, { revoke: () => undefined });
    renderPage();
    await screen.findByText("Ulises Último");

    const menu = await openMenuOf(u, "Ulises Último");
    const item = within(menu).getByRole("menuitem", { name: /Revocar rol/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(
      within(item).getByText("La plataforma necesita al menos un administrador de plataforma habilitado."),
    ).toBeInTheDocument();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(writeLines(router)).toEqual([]);
  });

  it("UI-PAD-005 asks for confirmation, revokes, and refetches the list", async () => {
    const u = userEvent.setup();
    const admins: Admins = { current: [PAULA, RAMON] };
    const router = servePage(admins, {
      revoke: () => {
        admins.current = [PAULA];
        return undefined;
      },
    });
    renderPage();
    await screen.findByText("Ramón Revocable");
    expect(listReads(router)).toBe(1);

    await revokeFromMenu(u, "Ramón Revocable");

    await waitFor(() => expect(screen.queryByText("Ramón Revocable")).not.toBeInTheDocument());
    expect(writeLines(router)).toEqual([`POST ${revokeUrl("u-ramon")}`]);
    expect(listReads(router)).toBe(2);
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("UI-PAD-005 sends nothing when the confirmation is cancelled", async () => {
    const u = userEvent.setup();
    const router = servePage({ current: [RAMON] }, { revoke: () => undefined });
    renderPage();
    await screen.findByText("Ramón Revocable");

    const menu = await openMenuOf(u, "Ramón Revocable");
    await u.click(within(menu).getByRole("menuitem", { name: "Revocar rol" }));
    const dialog = await screen.findByRole("dialog", { name: "Revocar rol de administrador de plataforma" });
    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(writeLines(router)).toEqual([]);
  });

  it.each<[string, ReturnType<typeof restError>, string]>([
    [
      "USER_LAST_PLATFORM_ADMIN",
      restError(409, "USER_LAST_PLATFORM_ADMIN"),
      "No puedes revocar el rol: la plataforma necesita al menos un administrador de plataforma habilitado. Hemos actualizado la lista.",
    ],
    [
      "USER_NOT_PLATFORM_ADMIN",
      restError(409, "USER_NOT_PLATFORM_ADMIN"),
      "Esta persona ya no es administradora de plataforma. Hemos actualizado la lista.",
    ],
    ["a 404", restError(404), "Esta cuenta ya no existe. Hemos actualizado la lista."],
  ])("UI-PAD-006 words %s and refetches the list, since the row was stale", async (_, refusal, message) => {
    const u = userEvent.setup();
    const router = servePage({ current: [RAMON] }, { revoke: () => { throw refusal; } });
    renderPage();
    await screen.findByText("Ramón Revocable");

    await revokeFromMenu(u, "Ramón Revocable");

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(message));
    await waitFor(() => expect(listReads(router)).toBe(2));
  });

  it("UI-PAD-006 words any other failure generically and leaves the list alone", async () => {
    const u = userEvent.setup();
    const router = servePage({ current: [RAMON] }, { revoke: () => { throw restError(500); } });
    renderPage();
    await screen.findByText("Ramón Revocable");

    await revokeFromMenu(u, "Ramón Revocable");

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith("No se ha podido revocar el rol. Inténtalo de nuevo."),
    );
    expect(listReads(router)).toBe(1);
  });
});

describe("as a records list (#347)", () => {
  it("UI-LST-003 keeps the actions column, with an empty cell on the caller's own row", async () => {
    servePage({ current: [PAULA, RAMON] });
    renderPage();

    await screen.findByText("Ramón Revocable");
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument();
    expect(within(rowOf("Ramón Revocable")).getByRole("button", { name: "Más acciones para Ramón Revocable" }))
      .toBeInTheDocument();
    const paulaCells = within(rowOf("Paula Plataforma")).getAllByRole("cell");
    expect(paulaCells).toHaveLength(4);
    expect(paulaCells[3]).toBeEmptyDOMElement();
  });

  it("UI-LST-004 shows what failed and a retry that reads the list again, not the empty state", async () => {
    // The first read fails; the retry is answered.
    let failNext = true;
    const admins: Admins = {
      get current() {
        if (failNext) {
          failNext = false;
          throw { response: { status: 500, headers: {}, data: { status: 500, message: "boom", errors: [] } } };
        }
        return [PAULA, RAMON];
      },
    };
    const router = servePage(admins);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar los administradores de plataforma.",
    );
    expect(screen.queryByText("No hay administradores de plataforma")).not.toBeInTheDocument();
    expect(listReads(router)).toBe(1);

    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Ramón Revocable")).toBeInTheDocument();
    expect(listReads(router)).toBe(2);
  });
});
