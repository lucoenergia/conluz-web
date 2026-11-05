import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { AxiosError, CanceledError } from "axios";
import { Route, Routes } from "react-router";
import { renderHookWithProviders, renderWithProviders } from "./test/renderWithProviders";
import { apiError } from "./test/apiError";
import { routeRequests, type Route as RequestRoute } from "./test/requestRouter";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser, buildSupply } from "./test/fixtures";
import type { CurrentUserResponse } from "./api/models";

// Tier 2: the subject is the cache's retry behaviour, so the real generated
// hooks run against a mocked customInstance and the app's own query client.
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from it.
vi.mock(import("./http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("./context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import { createAppQueryClient } from "./queryClient";
import { useGetSupply } from "./api/supplies/supplies";
import { CapabilityRoute } from "./components/Auth/CapabilityRoute";
import { AuthErrorBoundry } from "./components/ErrorBoundries/AuthErrorBoundry";
import { SESSION_EXPIRED_MESSAGE } from "./utils/session";

const COMMUNITY_ID = "community-a";
const SUPPLY_ID = "supply-1";
const SUPPLY_URL = `/api/v1/supplies/${SUPPLY_ID}`;
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const CURRENT_USER_URL = "/api/v1/users/current";

/** The app's client and its retry policy, without the backoff, so every retry shows at once. */
function appClient() {
  const client = createAppQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retryDelay: 0 } });
  return client;
}

/** Answers the supply read with each response in turn, repeating the last one. */
function serveSupply(...responses: Array<() => unknown>) {
  let call = 0;
  const router = routeRequests([
    { method: "GET", url: SUPPLY_URL, respond: () => responses[Math.min(call++, responses.length - 1)]() },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const fail = (error: unknown) => () => {
  throw error;
};

const supplyRequests = (requests: { url?: string }[]) => requests.filter((config) => config.url === SUPPLY_URL);

function readSupply() {
  return renderHookWithProviders(() => useGetSupply(SUPPLY_ID, { query: { throwOnError: false } }), {
    activeCommunityId: COMMUNITY_ID,
    queryClient: appClient(),
  });
}

describe("UI-DATA-002 a read is retried only on a transport fault or a 5xx (#327)", () => {
  it.each([400, 401, 403, 404, 429])("UI-DATA-002 a %i is requested once and the read fails", async (status) => {
    const router = serveSupply(fail(apiError(status)));

    const { result } = readSupply();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(supplyRequests(router.requests)).toHaveLength(1);
  });

  it.each([
    ["a 500", () => apiError(500)],
    ["a network failure", () => new AxiosError("Network Error", "ERR_NETWORK")],
    ["a timeout", () => new AxiosError("timeout of 30000ms exceeded", "ECONNABORTED")],
  ])("UI-DATA-002 %s is requested four times, then the read fails", async (_, error) => {
    const router = serveSupply(() => {
      throw error();
    });

    const { result } = readSupply();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(supplyRequests(router.requests)).toHaveLength(4);
  });

  it("UI-DATA-002 a 500 followed by a 200 is requested twice and the read succeeds", async () => {
    const supply = buildSupply({ id: SUPPLY_ID });
    const router = serveSupply(fail(apiError(500)), () => supply);

    const { result } = readSupply();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(supply);
    expect(supplyRequests(router.requests)).toHaveLength(2);
  });

  it("UI-DATA-002 a cancelled request is not requested again", async () => {
    const router = serveSupply(fail(new CanceledError("canceled")));

    const { result } = readSupply();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(supplyRequests(router.requests)).toHaveLength(1);
  });

  it("UI-DATA-002 an error that is not an HTTP one is not tried again", async () => {
    const queryFn = vi.fn(async () => {
      throw new Error("boom");
    });

    const { result } = renderHookWithProviders(() => useQuery({ queryKey: ["not-http"], queryFn }), {
      queryClient: appClient(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  describe("UI-DATA-002 a route whose capability check is refused redirects after one request", () => {
    function renderGuardedRoute(routes: RequestRoute[]) {
      mockLoggedUser = buildCurrentUser({ memberships: { [COMMUNITY_ID]: "COMMUNITY_MEMBER" } });
      const router = routeRequests(routes);
      mockCustomInstance.mockImplementation(router.handle);
      renderWithProviders(
        <Routes>
          <Route path="/" element={<p>Inicio</p>} />
          <Route
            path="/guarded"
            element={
              <CapabilityRoute require={{ scope: "community", capability: "canManage" }}>
                <p>Guarded</p>
              </CapabilityRoute>
            }
          />
        </Routes>,
        { route: "/guarded", activeCommunityId: COMMUNITY_ID, queryClient: appClient() },
      );
      return router;
    }

    it("UI-DATA-002 a 403 on the community's capabilities", async () => {
      const router = renderGuardedRoute([
        { method: "GET", url: COMMUNITY_URL, respond: fail(apiError(403)) },
        // Every 403 re-asks for the current user (recheckCurrentUserOn403).
        { method: "GET", url: CURRENT_USER_URL, respond: () => buildCurrentUser() },
      ]);

      expect(await screen.findByText("Inicio")).toBeInTheDocument();
      expect(screen.queryByText("Guarded")).not.toBeInTheDocument();
      expect(router.requests.filter((config) => config.url === COMMUNITY_URL)).toHaveLength(1);
    });

    it("UI-DATA-002 a 404 on the community's capabilities", async () => {
      const router = renderGuardedRoute([{ method: "GET", url: COMMUNITY_URL, respond: fail(apiError(404)) }]);

      expect(await screen.findByText("Inicio")).toBeInTheDocument();
      expect(screen.queryByText("Guarded")).not.toBeInTheDocument();
      expect(router.requests.filter((config) => config.url === COMMUNITY_URL)).toHaveLength(1);
    });

    it("UI-DATA-002 the guarded page renders when the capability is granted", async () => {
      renderGuardedRoute([
        {
          method: "GET",
          url: COMMUNITY_URL,
          respond: () =>
            buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canRead: true, canManage: true }) }),
        },
      ]);

      expect(await screen.findByText("Guarded")).toBeInTheDocument();
    });
  });

  it("UI-DATA-002 a 401 reaches AuthErrorBoundry after one request", async () => {
    const router = serveSupply(fail(apiError(401)));
    const onError = vi.fn();
    function ReadsSupply() {
      useGetSupply(SUPPLY_ID);
      return <p>Supply</p>;
    }
    // React reports the error the boundary catches; it is the subject here.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithProviders(
      <AuthErrorBoundry onError={onError}>
        <ReadsSupply />
      </AuthErrorBoundry>,
      { activeCommunityId: COMMUNITY_ID, queryClient: appClient() },
    );

    expect(await screen.findByText(SESSION_EXPIRED_MESSAGE)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(supplyRequests(router.requests)).toHaveLength(1);
    consoleError.mockRestore();
  });
});
