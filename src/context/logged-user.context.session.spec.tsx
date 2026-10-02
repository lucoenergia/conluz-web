import "@testing-library/jest-dom";
import type { FC } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useAuth, useAuthDispatch } from "../context/auth.context";
import { useLoggedUser } from "./logged-user.context";
import { useLogout } from "../hooks/useLogout";
import { AuthErrorBoundry } from "../components/ErrorBoundries/AuthErrorBoundry";
import { AuthenticatedLayout } from "../layouts/authenticated.layout";
import { Login } from "../pages/auth/Login";
import { createAppQueryClient } from "../queryClient";
import { renderWithProviders } from "../test/renderWithProviders";
import { routeRequests } from "../test/requestRouter";
import { buildCurrentUser } from "../test/fixtures";
import { getGetCurrentUserQueryKey } from "../api/users/users";
import { SESSION_EXPIRED_MESSAGE, markSessionExpired, takeSessionExpired } from "../utils/session";

/**
 * When the current-user query runs, and what happens when it is refused.
 *
 * Tier 2 throughout, because the subject of the first half is the ABSENCE of a
 * request -- which a mocked hook cannot express at all -- and of the second
 * half the interaction between a real query's error state and the app's own
 * `throwOnError`, which only exists when the real hook runs.
 */
const CURRENT_USER_URL = "/api/v1/users/current";

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const USER = buildCurrentUser({ id: "user-1", fullName: "Ada", memberships: {} });

/** Axios sets both; different readers in the app use different ones. */
function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { status, response: { status } });
}

/**
 * The production defaults, minus retries.
 *
 * `throwOnError` on 401 has to be the real one or the provider's opt-out would
 * be unobservable. Retries do not: in production the default three are what let
 * a transient 401 resolve on the next attempt, so `error` -- and the session
 * ending -- is only ever reached by a token the backend keeps refusing. Turning
 * them off is what lets this spec get there in one attempt.
 */
function appClientWithoutRetries(): QueryClient {
  const client = createAppQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } });
  return client;
}

const SessionProbe: FC = () => {
  const token = useAuth();
  const user = useLoggedUser();
  const dispatchAuth = useAuthDispatch();
  return (
    <>
      <span data-testid="token">{token ?? "no-token"}</span>
      <span data-testid="user">{user?.id ?? "none"}</span>
      <button onClick={() => dispatchAuth({ token: "a-token", remember: false })}>Entrar</button>
    </>
  );
};

const LogoutButton: FC = () => {
  const logout = useLogout();
  return <button onClick={logout}>Salir</button>;
};

const currentUserRequests = (router: ReturnType<typeof routeRequests>) =>
  router.requests.filter((request) => request.url === CURRENT_USER_URL);

describe("when the current-user query runs", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("does not run before there is a session", () => {
    const router = routeRequests([]);
    mockCustomInstance.mockImplementation(router.handle);

    renderWithProviders(<SessionProbe />, { activeCommunityId: null });

    expect(screen.getByTestId("token")).toHaveTextContent("no-token");
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    // Not just "no current-user request": nothing at all was sent. An unmatched
    // one would also fail this test by name, through requestRouter's afterEach.
    expect(router.requests).toEqual([]);
  });

  // The positive control. Without it, a provider that never queried at all
  // would pass the test above.
  it("runs once as soon as there is a token", async () => {
    const router = routeRequests([{ method: "GET", url: CURRENT_USER_URL, respond: () => USER }]);
    mockCustomInstance.mockImplementation(router.handle);

    renderWithProviders(<SessionProbe />, { activeCommunityId: null, token: "a-token" });

    expect(await screen.findByText("user-1")).toBeInTheDocument();
    expect(currentUserRequests(router)).toHaveLength(1);
  });

  it("starts when a token arrives mid-session, not before", async () => {
    const user = userEvent.setup();
    const router = routeRequests([{ method: "GET", url: CURRENT_USER_URL, respond: () => USER }]);
    mockCustomInstance.mockImplementation(router.handle);

    renderWithProviders(<SessionProbe />, { activeCommunityId: null });
    expect(currentUserRequests(router)).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("user-1")).toBeInTheDocument();
    expect(currentUserRequests(router)).toHaveLength(1);
  });
});

describe("when the current-user query is refused", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("ends the session instead of throwing to an error boundary", async () => {
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER_URL, respond: () => Promise.reject(httpError(401)) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
    const onError = vi.fn();
    const queryClient = appClientWithoutRetries();
    const clear = vi.spyOn(queryClient, "clear");

    renderWithProviders(
      <AuthErrorBoundry onError={onError}>
        <SessionProbe />
      </AuthErrorBoundry>,
      { activeCommunityId: null, token: "a-token", queryClient },
    );

    await waitFor(() => expect(screen.getByTestId("token")).toHaveTextContent("no-token"));
    expect(clear).toHaveBeenCalled();

    // Not through the boundary: this provider sits above every one of them, so
    // the global 401 `throwOnError` would have taken down the tree.
    expect(onError).not.toHaveBeenCalled();
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument();

    // And it did not loop: clearing the cache destroys the query, and a fresh
    // one would refetch if the token had not gone first.
    expect(currentUserRequests(router)).toHaveLength(1);
  });

  it("leaves the session alone when the backend merely fails", async () => {
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER_URL, respond: () => Promise.reject(httpError(500)) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
    const queryClient = appClientWithoutRetries();
    const clear = vi.spyOn(queryClient, "clear");

    renderWithProviders(<SessionProbe />, {
      activeCommunityId: null,
      token: "a-token",
      queryClient,
    });

    // Waiting for the request is not enough: the effect that would end the
    // session runs after the error lands, so asserting any earlier would pass
    // against a provider that ends the session on every error.
    await waitFor(() =>
      expect(queryClient.getQueryState(getGetCurrentUserQueryKey())?.status).toBe("error"),
    );
    expect(currentUserRequests(router)).toHaveLength(1);
    // A 500, or an offline browser, is an unanswered question rather than an
    // expiry. Logging somebody out over a backend blip would be worse than
    // showing them a stale menu.
    expect(screen.getByTestId("token")).toHaveTextContent("a-token");
    expect(clear).not.toHaveBeenCalled();
  });
});

describe("the login page after a session ends", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  function renderApp(queryClient: QueryClient) {
    return renderWithProviders(
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route index element={<SessionProbe />} />
        </Route>
        <Route path="login" element={<Login />} />
      </Routes>,
      { route: "/", activeCommunityId: null, token: "a-token", queryClient },
    );
  }

  it("says the session expired when that is why the user is there", async () => {
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER_URL, respond: () => Promise.reject(httpError(401)) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderApp(appClientWithoutRetries());

    // ProtectedRoute does the navigating -- the provider cannot, it sits above
    // the router -- and the reason survives the redirect to be shown here.
    expect(await screen.findByRole("alert")).toHaveTextContent(SESSION_EXPIRED_MESSAGE);
  });

  // Reaching the same page by asking to leave. The reason the provider records
  // is specific to an expiry, and a logout that claimed one would be a lie on
  // every deliberate exit.
  it("says nothing of the sort after a deliberate logout", async () => {
    const user = userEvent.setup();
    const router = routeRequests([{ method: "GET", url: CURRENT_USER_URL, respond: () => USER }]);
    mockCustomInstance.mockImplementation(router.handle);

    renderWithProviders(
      <Routes>
        <Route index element={<LogoutButton />} />
        <Route path="login" element={<Login />} />
      </Routes>,
      { route: "/", activeCommunityId: null, token: "a-token" },
    );

    await user.click(screen.getByRole("button", { name: "Salir" }));

    expect(await screen.findByRole("heading", { name: "Bienvenide a ConLuz" })).toBeInTheDocument();
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument();
  });

  it("says nothing of the sort on a plain visit", async () => {
    const router = routeRequests([{ method: "GET", url: CURRENT_USER_URL, respond: () => USER }]);
    mockCustomInstance.mockImplementation(router.handle);

    renderWithProviders(<Login />, { activeCommunityId: null });

    await waitFor(() => expect(screen.getByRole("button", { name: /Acceder|Entrar/ })).toBeInTheDocument());
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument();
    expect(currentUserRequests(router)).toHaveLength(0);
  });

  /**
   * On the flag itself rather than through two renders: the harness clears
   * browser storage before every render, so a second `renderWithProviders`
   * would show no message whether or not the read clears the flag -- a test
   * that cannot fail.
   */
  it("is read once, so a later visit does not claim an expiry again", () => {
    markSessionExpired();

    expect(takeSessionExpired()).toBe(true);
    expect(takeSessionExpired()).toBe(false);
  });

  it("claims nothing when no session has ended", () => {
    expect(takeSessionExpired()).toBe(false);
  });
});
