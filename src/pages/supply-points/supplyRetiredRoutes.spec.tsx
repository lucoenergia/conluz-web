import "@testing-library/jest-dom";
import type { FC } from "react";
import { act, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import App from "../../App";
import { CommunityRole } from "../../hooks/permissions";
import { createAppQueryClient } from "../../queryClient";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";

/**
 * The supply create and edit pages are gone (#372): both forms open over the
 * supply list, and no redirect is kept, since a redirect route would itself
 * end in new or edit (UI-OVL-008). An old link lands where the route table
 * puts it, against the real App.tsx.
 *
 * Tier 2: what the route table renders includes what its pages send, so the
 * production query client (minus retries) and the generated hooks run, and
 * only the transport is replaced. A request the router does not serve fails
 * the test that sent it.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY_ID = "community-a";
const ADMIN = buildCurrentUser({
  id: "user-1",
  fullName: "Ana Admin",
  memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_ADMIN },
});
const COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: "Sol Común",
  capabilities: buildCommunityCapabilities({ canRead: true, canManage: true }),
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

const expectNoSupplyForm = () => {
  expect(screen.queryByRole("textbox", { name: /^CUPS/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
};

// App.tsx loads every page on demand; loading these up front keeps a test
// from paying its transform inside its own timeout.
beforeAll(async () => {
  await Promise.all([import("../not-found/NotFoundPage"), import("./SupplyDetailPage")]);
}, 60_000);

beforeEach(() => {
  mockCustomInstance.mockReset();
});

describe("an old supply edit link", () => {
  it.each([
    ["with a session", "a-token"],
    ["without a session", undefined],
  ])("UI-ROUTE-001 renders the not-found page %s, and no supply", async (_, token) => {
    const router = routeRequests(token ? [{ method: "GET", url: "/api/v1/users/current", respond: () => ADMIN }] : []);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt("/supply-points/supply-1/edit", token);

    expect(await screen.findByRole("heading", { level: 1, name: "Esta página no existe" })).toBeInTheDocument();
    await settle();
    expectNoSupplyForm();
    expect(currentPath()).toBe("/supply-points/supply-1/edit");
    // Not read as the detail page of a supply called "supply-1".
    expect(router.requests.some((r) => r.url?.startsWith("/api/v1/supplies/"))).toBe(false);
  });
});

// "new" sits where a supply id would, so the route table reads it as one: the
// detail page asks for it, and says it does not exist. Accepted in #372; a
// route of its own to catch it would end in new (UI-OVL-008).
describe("an old supply create link", () => {
  it("shows the supply detail page's not-found state, and no form", async () => {
    const router = routeRequests([
      { method: "GET", url: "/api/v1/users/current", respond: () => ADMIN },
      { method: "GET", url: "/api/v1/communities", respond: () => [COMMUNITY] },
      { method: "GET", url: `/api/v1/communities/${COMMUNITY_ID}`, respond: () => COMMUNITY },
      {
        method: "GET",
        url: "/api/v1/supplies/new",
        respond: () => {
          throw apiError(404);
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt("/supply-points/new", "a-token");

    expect(await screen.findByRole("heading", { name: "Punto de suministro no encontrado" })).toBeInTheDocument();
    await settle();
    expectNoSupplyForm();
    expect(currentPath()).toBe("/supply-points/new");
  });
});
