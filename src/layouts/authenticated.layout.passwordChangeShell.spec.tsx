import "@testing-library/jest-dom";
import type { FC } from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes, useLocation } from "react-router";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { customInstance } from "../api/custom-instance";
import { useAuth } from "../context/auth.context";
import { Login } from "../pages/auth/Login";
import { ChangePasswordPage } from "../pages/auth/ChangePassword";
import { AuthenticatedLayout } from "./authenticated.layout";
import { LOGOUT_TIMEOUT_MS } from "../hooks/useLogout";
import { createAppQueryClient } from "../queryClient";
import { renderWithProviders } from "../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter, type Route as RequestRoute } from "../test/requestRouter";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser } from "../test/fixtures";
import { CommunityRole } from "../api/models";

/**
 * While the caller must change their password, the app mounts nothing that
 * asks the backend for anything but the three requests it still answers
 * (#213): reading the current user, changing the password, and logging out.
 *
 * Tier 2: the subject is which requests the real header, side menu, scope
 * context and pages send when they actually mount, so the real query client
 * and the real generated hooks run and only the transport is replaced. A
 * request the router does not serve fails the test that sent it.
 */
const CURRENT_USER = "/api/v1/users/current";
const CHANGE_PASSWORD = "/api/v1/users/current/password";
const LOGOUT = "/api/v1/logout";
const LOGIN = "/api/v1/login";
const COMMUNITIES = "/api/v1/communities";
const COMMUNITY_A = "/api/v1/communities/community-a";
const PROBE = "/api/v1/probe";

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const MEMBER = buildCurrentUser({
  id: "user-1",
  fullName: "Ana Socia",
  memberships: { "community-a": CommunityRole.COMMUNITY_MEMBER },
  mustChangePassword: false,
});

const COMMUNITY = buildCommunity({
  id: "community-a",
  name: "Comunidad A",
  capabilities: buildCommunityCapabilities({ canRead: true }),
});

/** Any page but the change-password one. It reads the API, so mounting it shows up as a request. */
const ProbePage: FC = () => {
  useQuery({ queryKey: ["probe"], queryFn: () => customInstance({ url: PROBE, method: "GET" }) });
  return <span>probe page</span>;
};

const PathOutput: FC = () => <output aria-label="path">{useLocation().pathname}</output>;
const TokenOutput: FC = () => <output aria-label="token">{useAuth() ?? "none"}</output>;

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

function renderAt(route: string) {
  return renderWithProviders(
    <>
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="*" element={<ProbePage />} />
        </Route>
        <Route path="login" element={<Login />} />
      </Routes>
      <PathOutput />
      <TokenOutput />
    </>,
    // The active community is not seeded: the real provider auto-selects the
    // only membership, as it does in production.
    { route, token: "a-token", queryClient: appClientWithoutRetries() },
  );
}

/** The three requests the backend still answers for a flagged caller. */
const ALLOWED = [`GET ${CURRENT_USER}`, `PUT ${CHANGE_PASSWORD}`, `POST ${LOGOUT}`];

function allowedRoutes(overrides: Partial<Record<"user" | "password" | "logout", RequestRoute["respond"]>> = {}) {
  const routes: RequestRoute[] = [
    { method: "GET", url: CURRENT_USER, respond: overrides.user ?? (() => ({ ...MEMBER, mustChangePassword: true })) },
    { method: "PUT", url: CHANGE_PASSWORD, respond: overrides.password ?? (() => undefined) },
    { method: "POST", url: LOGOUT, respond: overrides.logout ?? (() => undefined) },
  ];
  return routes;
}

const describeRequest = (request: RequestConfig) => `${(request.method ?? "GET").toUpperCase()} ${request.url}`;
const requestSet = (router: RequestRouter) => new Set(router.requests.map(describeRequest));
const countOf = (router: RequestRouter, request: string) =>
  router.requests.map(describeRequest).filter((sent) => sent === request).length;

/** Lets every pending query, effect and lazy mount run, so a request that is coming has been sent. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

const currentPath = () => screen.getByRole("status", { name: "path" }).textContent;
const currentToken = () => screen.getByRole("status", { name: "token" }).textContent;
const findForm = () => screen.findByRole("heading", { level: 1, name: "Cambiar contraseña" });

function networkError() {
  return Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });
}

function unauthorized() {
  return Object.assign(new Error("HTTP 401"), { status: 401, response: { status: 401, data: { errors: [] } } });
}

beforeEach(() => {
  mockCustomInstance.mockReset();
});

describe("a caller who must change their password (#213)", () => {
  it.each(["/change-password", "/supply-points"])(
    "sends only the current-user read when entering at %s (AC1)",
    async (route) => {
      const router = routeRequests(allowedRoutes());
      mockCustomInstance.mockImplementation(router.handle);

      renderAt(route);
      await findForm();
      await settle();

      expect(requestSet(router)).toEqual(new Set([`GET ${CURRENT_USER}`]));
    },
  );

  it("sends nothing outside the allowed three, all the way to logging out (AC1)", async () => {
    const user = userEvent.setup();
    const router = routeRequests(allowedRoutes());
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/change-password");
    await findForm();
    await user.click(screen.getByRole("button", { name: "Salir" }));
    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    await settle();

    for (const request of requestSet(router)) expect(ALLOWED).toContain(request);
    expect(countOf(router, `POST ${LOGOUT}`)).toBe(1);
  });

  it("shows the form and a way out, and nothing of the header or menu (AC2)", async () => {
    const router = routeRequests(allowedRoutes());
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/change-password");
    await findForm();
    await settle();

    expect(screen.getByLabelText("Contraseña actual")).toBeInTheDocument();
    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Repite la nueva contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByRole("button", { name: "Salir" })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "menu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir menú de usuario" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ámbito de la página" })).not.toBeInTheDocument();
    expect(screen.queryByText("Selecciona una comunidad")).not.toBeInTheDocument();
    expect(screen.queryByText("Cargando comunidad…")).not.toBeInTheDocument();

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("is still taken to /change-password from any other route, which never mounts (AC5)", async () => {
    const router = routeRequests(allowedRoutes());
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/supply-points");
    await findForm();

    expect(currentPath()).toBe("/change-password");
    expect(screen.queryByText("probe page")).not.toBeInTheDocument();
  });

  describe("logging out from the shell (AC3)", () => {
    it("revokes the token on the backend, then ends the session on the login page", async () => {
      const user = userEvent.setup();
      // Read when the backend is asked, not after: the bearer token is attached
      // from the session, so the session must still be there at that moment.
      let tokenWhenSent: string | null | undefined;
      const router = routeRequests(
        allowedRoutes({
          logout: () => {
            tokenWhenSent = currentToken();
            return undefined;
          },
        }),
      );
      mockCustomInstance.mockImplementation(router.handle);

      renderAt("/change-password");
      await findForm();
      await user.click(screen.getByRole("button", { name: "Salir" }));

      expect(await screen.findByRole("heading", { name: "Bienvenide a ConLuz" })).toBeInTheDocument();
      expect(countOf(router, `POST ${LOGOUT}`)).toBe(1);
      expect(tokenWhenSent).toBe("a-token");
      expect(currentPath()).toBe("/login");
      expect(currentToken()).toBe("none");
    });

    it.each([
      ["a network error", networkError],
      ["a 401", unauthorized],
    ])("still ends the session on the login page when the call fails with %s", async (_, failure) => {
      const user = userEvent.setup();
      const router = routeRequests(allowedRoutes({ logout: () => Promise.reject(failure()) }));
      mockCustomInstance.mockImplementation(router.handle);

      renderAt("/change-password");
      await findForm();
      await user.click(screen.getByRole("button", { name: "Salir" }));

      expect(await screen.findByRole("heading", { name: "Bienvenide a ConLuz" })).toBeInTheDocument();
      expect(countOf(router, `POST ${LOGOUT}`)).toBe(1);
      expect(currentPath()).toBe("/login");
      expect(currentToken()).toBe("none");
    });

    describe("when the backend never answers", () => {
      beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("ends the session on the login page once the timeout passes", async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        let tokenWhenSent: string | null | undefined;
        const router = routeRequests(
          allowedRoutes({
            logout: () => {
              tokenWhenSent = currentToken();
              return new Promise(() => {});
            },
          }),
        );
        mockCustomInstance.mockImplementation(router.handle);

        renderAt("/change-password");
        await findForm();
        await user.click(screen.getByRole("button", { name: "Salir" }));

        expect(countOf(router, `POST ${LOGOUT}`)).toBe(1);
        expect(tokenWhenSent).toBe("a-token");
        expect(currentToken()).toBe("a-token");

        await act(async () => {
          await vi.advanceTimersByTimeAsync(LOGOUT_TIMEOUT_MS);
        });

        expect(await screen.findByRole("heading", { name: "Bienvenide a ConLuz" })).toBeInTheDocument();
        expect(currentPath()).toBe("/login");
        expect(currentToken()).toBe("none");
      });

      it("sends one request however many times Salir is clicked", async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const router = routeRequests(allowedRoutes({ logout: () => new Promise(() => {}) }));
        mockCustomInstance.mockImplementation(router.handle);

        renderAt("/change-password");
        await findForm();
        const salir = screen.getByRole("button", { name: "Salir" });
        await user.dblClick(salir);
        await user.click(salir);

        expect(countOf(router, `POST ${LOGOUT}`)).toBe(1);

        await act(async () => {
          await vi.advanceTimersByTimeAsync(LOGOUT_TIMEOUT_MS);
        });
        expect(await screen.findByRole("heading", { name: "Bienvenide a ConLuz" })).toBeInTheDocument();
        expect(countOf(router, `POST ${LOGOUT}`)).toBe(1);
      });
    });
  });

  it("gets the normal layout after changing the password and signing in again", async () => {
    const user = userEvent.setup();
    let flagged = true;
    const router = routeRequests([
      ...allowedRoutes({
        user: () => ({ ...MEMBER, mustChangePassword: flagged }),
        password: () => {
          flagged = false;
          return undefined;
        },
      }),
      { method: "POST", url: LOGIN, respond: () => ({ token: "a-new-token" }) },
      { method: "GET", url: COMMUNITY_A, respond: () => COMMUNITY },
      { method: "GET", url: COMMUNITIES, respond: () => [COMMUNITY] },
      { method: "GET", url: PROBE, respond: () => ({}) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/change-password");
    await findForm();
    await user.type(screen.getByLabelText("Contraseña actual"), "la contraseña de antes");
    await user.type(screen.getByLabelText("Nueva contraseña"), "el gato duerme junto a la ventana");
    await user.type(screen.getByLabelText("Repite la nueva contraseña"), "el gato duerme junto a la ventana");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    // Nothing but the allowed three while the flag was set.
    for (const request of requestSet(router)) expect(ALLOWED).toContain(request);

    await user.type(screen.getByPlaceholderText(/DNI\/NIF/i), "1234567Z");
    await user.click(screen.getByPlaceholderText(/contraseña/i));
    await user.paste("el gato duerme junto a la ventana");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "menu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú de usuario" })).toBeInTheDocument();
    // Waited for, not held: the routed page remounts once the active community resolves.
    await waitFor(() => expect(screen.getByText("probe page")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Salir" })).not.toBeInTheDocument();
  });
});

describe("a caller who need not change their password (AC4)", () => {
  it("gets the header, the side menu and the routed page, with the same requests as before #213", async () => {
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER, respond: () => MEMBER },
      { method: "GET", url: COMMUNITY_A, respond: () => COMMUNITY },
      { method: "GET", url: COMMUNITIES, respond: () => [COMMUNITY] },
      { method: "GET", url: PROBE, respond: () => ({}) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/supply-points");

    // Waited for, not held: the routed page remounts once the active community resolves.
    await waitFor(() => expect(screen.getByText("probe page")).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText("Comunidad A").length).toBeGreaterThan(0));
    await settle();

    expect(screen.getByRole("button", { name: "menu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú de usuario" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByText("probe page")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salir" })).not.toBeInTheDocument();
    expect(currentPath()).toBe("/supply-points");

    expect(requestSet(router)).toEqual(
      new Set([`GET ${CURRENT_USER}`, `GET ${COMMUNITY_A}`, `GET ${COMMUNITIES}`, `GET ${PROBE}`]),
    );
  });
});
