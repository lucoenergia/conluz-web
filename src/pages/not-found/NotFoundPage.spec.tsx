import "@testing-library/jest-dom";
import type { FC } from "react";
import { act, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import App from "../../App";
import { CommunityRole } from "../../hooks/permissions";
import { createAppQueryClient } from "../../queryClient";
import { buildCurrentUser } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";

/**
 * The not-found page (#234), against the real route table in App.tsx: any
 * path no route matches renders it, for a caller with or without a session.
 *
 * Tier 2: what is under test includes what the real providers send on this
 * route, so the production query client and the generated hooks run, and only
 * the transport is replaced. A request the router does not serve fails the
 * test that sent it.
 */
const CURRENT_USER = "/api/v1/users/current";

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const MEMBER = buildCurrentUser({
  id: "user-1",
  fullName: "Ana Socia",
  memberships: { "community-a": CommunityRole.COMMUNITY_MEMBER },
});

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

function renderAppAt(url: string, token?: string) {
  window.history.replaceState(null, "", url);
  return renderWithProviders(
    <>
      <App />
      <PathOutput />
    </>,
    { browserHistory: true, token, queryClient: appClientWithoutRetries() },
  );
}

const currentPath = () => screen.getByRole("status", { name: "path" }).textContent;
const findHeading = () => screen.findByRole("heading", { level: 1, name: "Esta página no existe" });

/** Lets every pending query, effect and lazy mount run, so a request that is coming has been sent. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

// App.tsx loads every page on demand; loading this one up front keeps a test
// from paying its transform inside its own timeout.
beforeAll(async () => {
  await import("./NotFoundPage");
});

beforeEach(() => {
  mockCustomInstance.mockReset();
});

describe("without a session", () => {
  it.each(["/esto-no-existe", "/production/p-1/unknown/deeper"])(
    "UI-ROUTE-001 renders the not-found page at %s, with a link to /",
    async (url) => {
      const router = routeRequests([]);
      mockCustomInstance.mockImplementation(router.handle);

      renderAppAt(url);

      expect(await findHeading()).toBeInTheDocument();
      expect(
        screen.getByText("Puede que el enlace sea antiguo o que la dirección esté mal escrita."),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
      // Not a failure of the app: nothing is announced as an error.
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      await settle();
      expect(currentPath()).toBe(url);
    },
  );

  it("UI-ROUTE-002 sends no request without a session", async () => {
    const router = routeRequests([]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt("/esto-no-existe");
    await findHeading();
    await settle();

    expect(router.requests).toEqual([]);
  });
});

describe("with a session", () => {
  it("UI-ROUTE-001 renders the not-found page for a signed-in caller", async () => {
    const router = routeRequests([{ method: "GET", url: CURRENT_USER, respond: () => MEMBER }]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt("/esto-no-existe", "a-token");

    expect(await findHeading()).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/");
    await settle();
    // Served in place: a signed-in caller is not sent anywhere.
    expect(currentPath()).toBe("/esto-no-existe");
  });
});
