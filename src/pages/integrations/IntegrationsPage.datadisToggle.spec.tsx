import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type Route } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCommunityCapabilities } from "../../test/fixtures";
import type { GetDatadisConfigResponse } from "../../api/models";
import { IntegrationsPage } from "./IntegrationsPage";

// Tier 2: the real generated hooks against a real QueryClient, with only the
// HTTP layer replaced. The subject is what the Datadis switch sends, what it
// leaves in the cache, and what the next save reads from it, which a mocked
// hook cannot show (#256).
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY_ID = "community-a";
const CONFIG_URL = `/api/v1/communities/${COMMUNITY_ID}/config/datadis`;

const stored = (overrides: Partial<GetDatadisConfigResponse> = {}): GetDatadisConfigResponse => ({
  enabled: true,
  passwordSet: true,
  username: "datadis-user",
  baseUrl: "https://datadis.example",
  ...overrides,
});

/** A response the test releases when it chooses, to hold a refetch in flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * The page's own reads, with the Datadis configuration answered by `readDatadis`
 * on every GET, so a test can change what the next read returns.
 */
function serve(readDatadis: () => unknown, extra: Route[] = []) {
  const router = routeRequests([
    {
      method: "GET",
      url: `/api/v1/communities/${COMMUNITY_ID}`,
      respond: () =>
        buildCommunity({
          id: COMMUNITY_ID,
          name: "Comunidad A",
          capabilities: buildCommunityCapabilities({ canRead: true, canManage: true }),
        }),
    },
    { method: "GET", url: `/api/v1/communities/${COMMUNITY_ID}/config/shelly`, respond: () => ({ enabled: false }) },
    { method: "GET", url: CONFIG_URL, respond: readDatadis },
    ...extra,
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const requestsTo = (requests: RequestConfig[], method: string, url: string) =>
  requests.filter((r) => (r.method ?? "GET").toUpperCase() === method && r.url === url);

const datadis = () => screen.getByRole("region", { name: "Datadis" });
const datadisSwitch = () => within(datadis()).getByRole("switch", { name: "Integración con Datadis activa" });
const guardar = () => within(datadis()).getByRole("button", { name: "Guardar" });
const confirmation = () => screen.getByTestId("modal-panel");

/** Flips the switch and confirms the write it asks for. */
async function toggle(user: ReturnType<typeof userEvent.setup>, confirmLabel: "Activar" | "Desactivar") {
  await user.click(datadisSwitch());
  await user.click(within(confirmation()).getByRole("button", { name: confirmLabel }));
}

/** Guardar, then the save confirmation that names the community. */
async function save(user: ReturnType<typeof userEvent.setup>) {
  await user.click(guardar());
  await user.click(within(confirmation()).getByRole("button", { name: "Guardar" }));
}

const render = () => renderWithProviders(<IntegrationsPage />, { activeCommunityId: COMMUNITY_ID });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the Datadis switch and the next save", () => {
  it("UI-INT-014 Guardar waits while the configuration is read again after a toggle", async () => {
    const user = userEvent.setup();
    let current = stored({ enabled: true });
    let held: ReturnType<typeof deferred<GetDatadisConfigResponse>> | null = null;
    serve(() => (held ? held.promise : current), [
      { method: "POST", url: `${CONFIG_URL}/disable`, respond: () => undefined },
    ]);
    render();
    await waitFor(() => expect(datadisSwitch()).toBeChecked());

    held = deferred();
    await toggle(user, "Desactivar");

    await waitFor(() => expect(guardar()).toBeDisabled());
    current = stored({ enabled: false });
    const release = held;
    held = null;
    release.resolve(current);
    await waitFor(() => expect(guardar()).toBeEnabled());
  });

  it.each([
    ["disabling", "disable", true, "Desactivar", false],
    ["enabling", "enable", false, "Activar", true],
  ] as const)(
    "UI-INT-014 a save after %s, when the read that follows fails, sends the enabled the switch stored, not the one read before",
    async (_, endpoint, before, confirmLabel, after) => {
      const user = userEvent.setup();
      let failNext = false;
      const router = serve(
        () => {
          if (failNext) throw apiError(503);
          return stored({ enabled: before });
        },
        [
          { method: "POST", url: `${CONFIG_URL}/${endpoint}`, respond: () => undefined },
          { method: "PUT", url: CONFIG_URL, respond: () => stored({ enabled: after }) },
        ],
      );
      render();
      await waitFor(() => expect(datadisSwitch()).toHaveProperty("checked", before));

      // The read after the toggle fails: the query keeps its data, stops
      // fetching, and Guardar is offered again with whatever the cache holds.
      failNext = true;
      await toggle(user, confirmLabel);
      await waitFor(() => expect(requestsTo(router.requests, "GET", CONFIG_URL)).toHaveLength(2));
      await waitFor(() => expect(guardar()).toBeEnabled());

      await save(user);

      await waitFor(() => expect(requestsTo(router.requests, "PUT", CONFIG_URL)).toHaveLength(1));
      expect(requestsTo(router.requests, "PUT", CONFIG_URL)[0].data).toHaveProperty("enabled", after);
    },
  );
});
