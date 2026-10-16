import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { createAppQueryClient } from "../../queryClient";
import { routeRequests, type RequestConfig, type Route } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCommunityCapabilities } from "../../test/fixtures";
import type { GetDatadisConfigResponse } from "../../api/models";
import { IntegrationsPage } from "./IntegrationsPage";

// Tier 2: the real generated hooks against a real QueryClient, with only the
// HTTP layer replaced. The subject is what the Datadis switch and the first
// save send, and what the refetch after each one shows, which a mocked hook
// cannot show (#256).
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

describe("the Datadis switch", () => {
  const DISABLED = "La integración está desactivada. Actívala para empezar a sincronizar.";

  /** A stored configuration whose `enabled` the enable and disable endpoints move. */
  function serveToggleable(enabled: boolean) {
    let current = stored({ enabled });
    return serve(() => current, [
      {
        method: "POST",
        url: `${CONFIG_URL}/disable`,
        respond: () => {
          current = { ...current, enabled: false };
          return undefined;
        },
      },
      {
        method: "POST",
        url: `${CONFIG_URL}/enable`,
        respond: () => {
          current = { ...current, enabled: true };
          return undefined;
        },
      },
    ]);
  }

  it("UI-INT-012 AC1 turning it off calls disable, never the PUT, and says the integration is off", async () => {
    const user = userEvent.setup();
    const router = serveToggleable(true);
    const { queryClient } = render();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await waitFor(() => expect(datadisSwitch()).toBeChecked());
    expect(within(datadis()).queryByText(DISABLED)).not.toBeInTheDocument();

    await toggle(user, "Desactivar");

    await waitFor(() => expect(datadisSwitch()).not.toBeChecked());
    expect(within(datadis()).getByText(DISABLED)).toBeVisible();
    expect(requestsTo(router.requests, "POST", `${CONFIG_URL}/disable`)).toHaveLength(1);
    expect(requestsTo(router.requests, "POST", `${CONFIG_URL}/enable`)).toHaveLength(0);
    expect(requestsTo(router.requests, "PUT", CONFIG_URL)).toEqual([]);
    // Only this community's Datadis configuration is read back.
    expect(invalidate.mock.calls).toEqual([[{ queryKey: [CONFIG_URL] }]]);
  });

  it("UI-INT-012 AC2 turning it on calls enable, never the PUT, and the disabled text goes", async () => {
    const user = userEvent.setup();
    const router = serveToggleable(false);
    render();
    await waitFor(() => expect(within(datadis()).getByText(DISABLED)).toBeVisible());
    expect(datadisSwitch()).not.toBeChecked();

    await toggle(user, "Activar");

    await waitFor(() => expect(datadisSwitch()).toBeChecked());
    expect(within(datadis()).queryByText(DISABLED)).not.toBeInTheDocument();
    expect(requestsTo(router.requests, "POST", `${CONFIG_URL}/enable`)).toHaveLength(1);
    expect(requestsTo(router.requests, "PUT", CONFIG_URL)).toEqual([]);
  });

  it("UI-INT-014 AC5 AC6 with no configuration there is no switch, the first save sends no enabled, and the switch then arrives off", async () => {
    const user = userEvent.setup();
    let current: GetDatadisConfigResponse | null = null;
    const router = serve(
      () => {
        if (!current) throw apiError(404, { code: "DATADIS_CONFIG_NOT_FOUND" });
        return current;
      },
      [
        {
          method: "PUT",
          url: CONFIG_URL,
          respond: (config) => {
            // The backend creates a configuration disabled (lucoenergia/conluz#425).
            const sent = config.data as { username: string; baseUrl: string };
            current = { enabled: false, username: sent.username, baseUrl: sent.baseUrl, passwordSet: true };
            return current;
          },
        },
      ],
    );
    render();
    await screen.findByRole("region", { name: "Datadis" });
    // Settled on the 404: Guardar is offered once the read has answered.
    await waitFor(() => expect(guardar()).toBeEnabled());
    const usuario = within(datadis()).getByLabelText("Usuario");
    expect(within(datadis()).queryByRole("switch")).not.toBeInTheDocument();
    expect(within(datadis()).queryByText(DISABLED)).not.toBeInTheDocument();

    await user.type(usuario, "datadis-user");
    await user.type(within(datadis()).getByLabelText("Contraseña"), "secreta");
    await user.type(within(datadis()).getByLabelText("URL del servicio"), "https://datadis.es");
    await save(user);

    await waitFor(() => expect(requestsTo(router.requests, "PUT", CONFIG_URL)).toHaveLength(1));
    expect(requestsTo(router.requests, "PUT", CONFIG_URL)[0].data).toEqual({
      username: "datadis-user",
      password: "secreta",
      baseUrl: "https://datadis.es",
    });
    expect(requestsTo(router.requests, "PUT", CONFIG_URL)[0].data).not.toHaveProperty("enabled");
    await waitFor(() => expect(datadisSwitch()).not.toBeChecked());
    expect(within(datadis()).getByText(DISABLED)).toBeVisible();
  });

  it("UI-INT-012 a configuration deleted meanwhile (404 DATADIS_CONFIG_NOT_FOUND) is reset, and the create state shows", async () => {
    const user = userEvent.setup();
    let deleted = false;
    serve(
      () => {
        if (deleted) throw apiError(404, { code: "DATADIS_CONFIG_NOT_FOUND" });
        return stored({ enabled: true });
      },
      [
        {
          method: "POST",
          url: `${CONFIG_URL}/disable`,
          respond: () => {
            deleted = true;
            throw apiError(404, { code: "DATADIS_CONFIG_NOT_FOUND" });
          },
        },
      ],
    );
    const { queryClient } = render();
    const reset = vi.spyOn(queryClient, "resetQueries");
    await waitFor(() => expect(datadisSwitch()).toBeChecked());

    await toggle(user, "Desactivar");

    await waitFor(() => expect(within(datadis()).queryByRole("switch")).not.toBeInTheDocument());
    expect(reset).toHaveBeenCalledWith({ queryKey: [CONFIG_URL] });
    // The create state: an empty form, not the stale configuration.
    expect(within(datadis()).getByLabelText("Usuario")).toHaveValue("");
    expect(within(datadis()).getByLabelText("URL del servicio")).toHaveValue("");
    expect(within(datadis()).queryByText(DISABLED)).not.toBeInTheDocument();
  });

  it("UI-INT-014 a GET 404 shows the create form at once: the read is not retried", async () => {
    // The app's own query client, whose default retries a failed read three
    // times with backoff; the harness's turns retries off, which would hide it.
    const router = serve(() => {
      throw apiError(404, { code: "DATADIS_CONFIG_NOT_FOUND" });
    });
    renderWithProviders(<IntegrationsPage />, { activeCommunityId: COMMUNITY_ID, queryClient: createAppQueryClient() });

    await screen.findByRole("region", { name: "Datadis" });
    await waitFor(() => expect(guardar()).toBeEnabled());
    expect(within(datadis()).getByLabelText("Usuario")).toHaveValue("");
    expect(within(datadis()).queryByRole("switch")).not.toBeInTheDocument();
    expect(requestsTo(router.requests, "GET", CONFIG_URL)).toHaveLength(1);
  });
});
