import "@testing-library/jest-dom";
import type { FC } from "react";
import { act, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import App from "../../App";
import { createAppQueryClient } from "../../queryClient";
import { buildCurrentUser, buildPlatformCapabilities } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";

/**
 * The community create and edit pages are gone (#374): both forms open over
 * the communities list or the platform page, and no redirect is kept, since a
 * redirect route would itself end in new or edit (UI-OVL-008). An old link
 * lands where the route table puts it, against the real App.tsx.
 *
 * Unlike a plant's or a supply's, "new" here does not sit where an id would:
 * under /communities only :communityId/admins takes one, so both old links
 * match no route at all.
 *
 * Tier 2: the production query client (minus retries) and the generated hooks
 * run, and only the transport is replaced. A request the router does not
 * serve fails the test that sent it.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

/** The caller the old pages served: a platform admin who may create and edit communities. */
const PLATFORM_ADMIN = buildCurrentUser({
  id: "u-paula",
  fullName: "Paula Plataforma",
  isPlatformAdmin: true,
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true, canCreateCommunity: true }),
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

/** Lets every pending query, effect and lazy mount run, so a request that is coming has been sent. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 100)));

// App.tsx loads every page on demand; loading it up front keeps a test from
// paying its transform inside its own timeout.
beforeAll(async () => {
  await import("../not-found/NotFoundPage");
}, 60_000);

beforeEach(() => {
  mockCustomInstance.mockReset();
});

describe("an old community create or edit link", () => {
  it.each([
    ["/communities/new", "with a session", "a-token"],
    ["/communities/new", "without a session", undefined],
    ["/communities/community-1/edit", "with a session", "a-token"],
    ["/communities/community-1/edit", "without a session", undefined],
  ])("UI-ROUTE-001 %s renders the not-found page %s, and no community form", async (url, _, token) => {
    const router = routeRequests(
      token ? [{ method: "GET", url: "/api/v1/users/current", respond: () => PLATFORM_ADMIN }] : [],
    );
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt(url, token);

    expect(await screen.findByRole("heading", { level: 1, name: "Esta página no existe" })).toBeInTheDocument();
    await settle();
    expect(screen.queryByRole("textbox", { name: /^Nombre/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(currentPath()).toBe(url);
    // Not read as a community called "new" or "community-1".
    expect(router.requests.some((r) => /^\/api\/v1\/communities\//.test(r.url ?? ""))).toBe(false);
    expect(router.takeUnmatched()).toEqual([]);
  });
});
