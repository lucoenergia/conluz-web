import "@testing-library/jest-dom";
import type { FC } from "react";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { customInstance } from "../http/custom-instance";
import { useAuth } from "../context/auth.context";
import { Login } from "../pages/auth/Login";
import { LoginLayout } from "./login.layout";
import { createAppQueryClient } from "../queryClient";
import { renderWithProviders } from "../test/renderWithProviders";
import { routeRequests } from "../test/requestRouter";
import { buildCurrentUser } from "../test/fixtures";
import { SESSION_EXPIRED_MESSAGE } from "../utils/session";

/**
 * A 401 under LoginLayout (#310). The layout serves the signed-in caller too
 * (`allowSignedIn`: the password-recovery and invitation pages), and a query's
 * 401 is thrown to the nearest error boundary (src/queryClient.ts). Without
 * one here it unmounted the whole app.
 *
 * Tier 2: the subject is the real query client's 401 handling, so only the
 * transport is replaced.
 */
const CURRENT_USER_URL = "/api/v1/users/current";
const PROBE_URL = "/api/v1/probe";

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const unauthorized = () => Object.assign(new Error("HTTP 401"), { status: 401, response: { status: 401 } });

/** A page under the layout whose read answers 401. */
const ReadingPage: FC = () => {
  useQuery({ queryKey: ["probe"], queryFn: () => customInstance({ url: PROBE_URL, method: "GET" }) });
  return <p>Aceptar invitación</p>;
};

const TokenOutput: FC = () => <output aria-label="token">{useAuth() ?? "none"}</output>;

/** The production client and handlers, minus retries, so the 401 is final at once. */
function appClientWithoutRetries(): QueryClient {
  const client = createAppQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } });
  return client;
}

/** The two LoginLayout route groups, as App.tsx has them. */
function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route element={<LoginLayout />}>
        <Route path="login" element={<><Login /><TokenOutput /></>} />
      </Route>
      <Route element={<LoginLayout allowSignedIn />}>
        <Route path="accept-invitation" element={<ReadingPage />} />
      </Route>
    </Routes>,
    { route, token: "a-token", activeCommunityId: null, queryClient: appClientWithoutRetries() },
  );
}

describe("a 401 under LoginLayout", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("#310 is contained by the layout's boundary, ends the session and lands on the login form", async () => {
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER_URL, respond: () => buildCurrentUser({ id: "user-1", mustChangePassword: false }) },
      { method: "GET", url: PROBE_URL, respond: () => Promise.reject(unauthorized()) },
      // Logging out asks the backend to revoke the token first (#213). It is
      // already invalid, so the backend refuses, and the session ends anyway.
      { method: "POST", url: "/api/v1/logout", respond: () => Promise.reject(unauthorized()) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt("/accept-invitation");

    expect(await screen.findByRole("heading", { name: "Bienvenide a ConLuz" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "token" })).toHaveTextContent("none");
    // The login form, not the boundary's expiry message in its place.
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument();
    expect(router.requests.filter((request) => request.url === "/api/v1/logout")).toHaveLength(1);
  });
});
