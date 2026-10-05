import "@testing-library/jest-dom";
import type { FC } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes, useLocation } from "react-router";
import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import { customInstance } from "../api/custom-instance";
import { useAuth } from "../context/auth.context";
import { Login } from "../pages/auth/Login";
import { AuthenticatedLayout } from "./authenticated.layout";
import { createAppQueryClient } from "../queryClient";
import { renderWithProviders } from "../test/renderWithProviders";
import { routeRequests, type RequestRouter } from "../test/requestRouter";
import { buildCurrentUser } from "../test/fixtures";
import { CommunityRole } from "../api/models";

/**
 * How the authenticated app reacts to an API error status (#196):
 *
 * - a 403 from any call re-asks for the current user, and a caller who turns
 *   out to be flagged is sent to /change-password (AC6);
 * - a 401 from a page's query ends the session and lands on the login page
 *   (AC7);
 * - a 400 or a 429 is neither: no recheck, and the session stays.
 *
 * Tier 2: the subject is the cache -- a failed request on one query causing a
 * refetch of another -- so the real query client with the app's real handlers
 * runs, and only the transport is replaced. The 403 carries no error code on
 * purpose: none is defined for "password change required", and the recheck
 * must not depend on one.
 */
const CURRENT_USER_URL = "/api/v1/users/current";
const PROBE_URL = "/api/v1/probe";

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

// The chrome is not the subject, and its own capability reads would need
// routes of their own.
vi.mock("../components/Header/Header", () => ({ Header: () => <div>header</div> }));
vi.mock("../components/Menu/SideMenu", () => ({ SideMenu: () => <div>side menu</div> }));
vi.mock("../components/ScopeContext", () => ({ ScopeContext: () => null }));

const MEMBER = buildCurrentUser({
  id: "user-1",
  memberships: { "community-a": CommunityRole.COMMUNITY_MEMBER },
  mustChangePassword: false,
});

function forbidden() {
  return Object.assign(new Error("HTTP 403"), { status: 403, response: { status: 403, data: { errors: [] } } });
}

/** A page whose read answers 403, as any screen's would for a flagged caller. */
const ReadingPage: FC = () => {
  const { pathname } = useLocation();
  const token = useAuth();
  const { isError } = useQuery({
    queryKey: ["probe"],
    queryFn: () => customInstance({ url: PROBE_URL, method: "GET" }),
  });
  return (
    <>
      <output aria-label="path">{pathname}</output>
      <output aria-label="token">{token ?? "none"}</output>
      {isError && <span>refused</span>}
    </>
  );
};

/** A page whose write answers 403. */
const WritingPage: FC = () => {
  const { pathname } = useLocation();
  const { mutate, isError } = useMutation({
    mutationFn: () => customInstance({ url: PROBE_URL, method: "POST" }),
  });
  return (
    <>
      <output aria-label="path">{pathname}</output>
      <button onClick={() => mutate()}>Guardar</button>
      {isError && <span>refused</span>}
    </>
  );
};

const TokenOutput: FC = () => <output aria-label="token">{useAuth() ?? "none"}</output>;

const ChangePasswordProbe: FC = () => {
  const { pathname } = useLocation();
  return <output aria-label="path">{pathname}</output>;
};

/** The production client and handlers, minus retries, so a 403 is final at once. */
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
    <Routes>
      <Route element={<AuthenticatedLayout />}>
        <Route path="reading" element={<ReadingPage />} />
        <Route path="writing" element={<WritingPage />} />
        <Route path="change-password" element={<ChangePasswordProbe />} />
      </Route>
      <Route path="login" element={<><Login /><TokenOutput /></>} />
    </Routes>,
    { route, token: "a-token", activeCommunityId: null, queryClient: appClientWithoutRetries() },
  );
}

/** Serves the current user, and whether they are flagged from the given request on. */
function serveUser(flaggedFromRequest: number | null) {
  let served = 0;
  return () => {
    served += 1;
    return { ...MEMBER, mustChangePassword: flaggedFromRequest !== null && served >= flaggedFromRequest };
  };
}

const currentPath = () => screen.getByRole("status", { name: "path" }).textContent;
const currentUserRequests = (router: RequestRouter) =>
  router.requests.filter((request) => request.url === CURRENT_USER_URL);

describe("a 403 rechecks the current user", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("sends a caller flagged since the session started to /change-password, from a read", async () => {
    const router = routeRequests([
      // Not flagged on load; flagged when asked again -- the backend started
      // enforcing mid-session.
      { method: "GET", url: CURRENT_USER_URL, respond: serveUser(2) },
      { method: "GET", url: PROBE_URL, respond: () => Promise.reject(forbidden()) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/reading");

    await waitFor(() => expect(currentPath()).toBe("/change-password"));
    expect(currentUserRequests(router)).toHaveLength(2);
  });

  it("does the same from a write", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER_URL, respond: serveUser(2) },
      { method: "POST", url: PROBE_URL, respond: () => Promise.reject(forbidden()) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/writing");
    await user.click(await screen.findByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(currentPath()).toBe("/change-password"));
    expect(currentUserRequests(router)).toHaveLength(2);
  });

  it("leaves an unflagged caller where they are, with the 403 still a refusal", async () => {
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER_URL, respond: serveUser(null) },
      { method: "GET", url: PROBE_URL, respond: () => Promise.reject(forbidden()) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/reading");

    expect(await screen.findByText("refused")).toBeInTheDocument();
    await waitFor(() => expect(currentUserRequests(router)).toHaveLength(2));
    expect(currentPath()).toBe("/reading");
  });

  it("neither rechecks nor ends the session on a 400 or a 429", async () => {
    for (const status of [400, 429]) {
      mockCustomInstance.mockReset();
      const router = routeRequests([
        { method: "GET", url: CURRENT_USER_URL, respond: serveUser(null) },
        {
          method: "GET",
          url: PROBE_URL,
          respond: () => Promise.reject(Object.assign(new Error(`HTTP ${status}`), { status, response: { status } })),
        },
      ]);
      mockCustomInstance.mockImplementation(router.handle);

      const { unmount } = renderAt("/reading");

      expect(await screen.findByText("refused")).toBeInTheDocument();
      expect(currentUserRequests(router)).toHaveLength(1);
      expect(screen.getByRole("status", { name: "token" })).toHaveTextContent("a-token");
      expect(currentPath()).toBe("/reading");
      unmount();
    }
  });

  it("does not recheck the current user on its own 403", async () => {
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER_URL, respond: () => Promise.reject(forbidden()) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/reading");

    // Give a loop the chance to show itself before counting.
    await waitFor(() => expect(currentUserRequests(router)).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(currentUserRequests(router)).toHaveLength(1);
  });
});

describe("a 401 on an authenticated call (AC7)", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("ends the session and lands on the login page", async () => {
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER_URL, respond: serveUser(null) },
      {
        method: "GET",
        url: PROBE_URL,
        respond: () => Promise.reject(Object.assign(new Error("HTTP 401"), { status: 401, response: { status: 401 } })),
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/reading");

    expect(await screen.findByRole("heading", { name: "Bienvenide a ConLuz" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "token" })).toHaveTextContent("none");
  });
});
