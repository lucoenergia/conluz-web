import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import { getGetHuaweiConfigQueryKey } from "../../api/production/production";
import { PlantIntegrationsSection } from "./PlantIntegrationsSection";
import { NOT_CONFIGURED_TEXT } from "./huaweiConfig";
import { DISABLED_TEXT } from "../../utils/integrationStatus";
import type { GetHuaweiConfigResponse } from "../../api/models";

// Tier 2: the real generated hooks against a real QueryClient, with only the
// HTTP layer replaced. The subject is which plant each request names and which
// plant's query each write refreshes, which a mocked hook cannot show.
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const PLANT_A = "plant-a";
const PLANT_B = "plant-b";
const configUrl = (plantId: string) => `/api/v1/plants/${plantId}/production/huawei/config`;

const configured = (overrides: Partial<GetHuaweiConfigResponse> = {}): GetHuaweiConfigResponse => ({
  enabled: true,
  username: "huawei-user",
  baseUrl: "https://eu5.fusionsolar.huawei.com/thirdData",
  passwordSet: true,
  ...overrides,
});

const plant = (id: string) =>
  buildPlant({ id, capabilities: buildPlantCapabilities({ canRead: true, canManage: true }) });

/** Two plant detail sections side by side, each in a region named after its plant. */
function TwoPlants() {
  return (
    <>
      <section aria-label="Planta A">
        <PlantIntegrationsSection plant={plant(PLANT_A)} />
      </section>
      <section aria-label="Planta B">
        <PlantIntegrationsSection plant={plant(PLANT_B)} />
      </section>
    </>
  );
}

const region = (name: string) => screen.getByRole("region", { name });
const switchOf = (name: string) => within(region(name)).getByRole("switch", { name: "Integración con Huawei activa" });
const confirmation = () => screen.getByRole("dialog", { name: /^(Activar|Desactivar) integración con Huawei$/ });

const requestsTo = (requests: RequestConfig[], method: string, url: string) =>
  requests.filter((r) => (r.method ?? "GET").toUpperCase() === method && r.url === url);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the Huawei integration of two plants", () => {
  it("UI-INT-005 each plant writes its own configuration, and only its own query is refreshed", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "GET", url: configUrl(PLANT_A), respond: () => configured({ username: "user-a" }) },
      { method: "GET", url: configUrl(PLANT_B), respond: () => configured({ username: "user-b" }) },
      { method: "PUT", url: configUrl(PLANT_A), respond: () => undefined },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
    const { queryClient } = renderWithProviders(<TwoPlants />);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await within(region("Planta A")).findByText("user-a");
    await within(region("Planta B")).findByText("user-b");
    const readsOfB = requestsTo(router.requests, "GET", configUrl(PLANT_B)).length;

    await user.click(within(region("Planta A")).getByRole("button", { name: "Editar" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(requestsTo(router.requests, "GET", configUrl(PLANT_A))).toHaveLength(2));
    expect(requestsTo(router.requests, "PUT", configUrl(PLANT_A))).toHaveLength(1);
    expect(requestsTo(router.requests, "GET", configUrl(PLANT_B))).toHaveLength(readsOfB);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: getGetHuaweiConfigQueryKey(PLANT_A) });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: getGetHuaweiConfigQueryKey(PLANT_B) });
  });

  it("UI-INT-005 each plant toggles its own configuration, and only its own query is refreshed", async () => {
    const user = userEvent.setup();
    let bEnabled = true;
    const router = routeRequests([
      { method: "GET", url: configUrl(PLANT_A), respond: () => configured() },
      { method: "GET", url: configUrl(PLANT_B), respond: () => configured({ enabled: bEnabled }) },
      {
        method: "POST",
        url: `${configUrl(PLANT_B)}/disable`,
        respond: () => {
          bEnabled = false;
          return undefined;
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
    const { queryClient } = renderWithProviders(<TwoPlants />);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await waitFor(() => expect(switchOf("Planta B")).toBeChecked());
    const readsOfA = requestsTo(router.requests, "GET", configUrl(PLANT_A)).length;

    await user.click(switchOf("Planta B"));
    await user.click(within(confirmation()).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(switchOf("Planta B")).not.toBeChecked());
    expect(switchOf("Planta A")).toBeChecked();
    expect(requestsTo(router.requests, "GET", configUrl(PLANT_A))).toHaveLength(readsOfA);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: getGetHuaweiConfigQueryKey(PLANT_B) });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: getGetHuaweiConfigQueryKey(PLANT_A) });
  });
});

describe("the Huawei integration of one plant", () => {
  const renderOne = () => renderWithProviders(<PlantIntegrationsSection plant={plant(PLANT_A)} />);
  const theSwitch = () => screen.getByRole("switch", { name: "Integración con Huawei activa" });

  it("UI-INT-009 the switch never reaches the configuration write", async () => {
    const user = userEvent.setup();
    let enabled = true;
    const router = routeRequests([
      { method: "GET", url: configUrl(PLANT_A), respond: () => configured({ enabled }) },
      {
        method: "POST",
        url: `${configUrl(PLANT_A)}/disable`,
        respond: () => {
          enabled = false;
          return undefined;
        },
      },
      {
        method: "POST",
        url: `${configUrl(PLANT_A)}/enable`,
        respond: () => {
          enabled = true;
          return undefined;
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
    renderOne();

    await waitFor(() => expect(theSwitch()).toBeChecked());
    await user.click(theSwitch());
    await user.click(within(confirmation()).getByRole("button", { name: "Desactivar" }));
    await waitFor(() => expect(theSwitch()).not.toBeChecked());
    await user.click(theSwitch());
    await user.click(within(confirmation()).getByRole("button", { name: "Activar" }));
    await waitFor(() => expect(theSwitch()).toBeChecked());

    expect(router.requests.filter((r) => r.method?.toUpperCase() === "PUT")).toEqual([]);
  });

  it("UI-INT-009 a configuration deleted meanwhile (404 HUAWEI_CONFIG_NOT_FOUND) is read again, and shows the empty state", async () => {
    const user = userEvent.setup();
    let deleted = false;
    const router = routeRequests([
      {
        method: "GET",
        url: configUrl(PLANT_A),
        respond: () => {
          if (deleted) throw apiError(404);
          return configured();
        },
      },
      {
        method: "POST",
        url: `${configUrl(PLANT_A)}/disable`,
        respond: () => {
          deleted = true;
          throw apiError(404, { code: "HUAWEI_CONFIG_NOT_FOUND" });
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
    renderOne();

    await waitFor(() => expect(theSwitch()).toBeChecked());
    await user.click(theSwitch());
    await user.click(within(confirmation()).getByRole("button", { name: "Desactivar" }));

    expect(await screen.findByText(NOT_CONFIGURED_TEXT)).toBeVisible();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configurar" })).toBeVisible();
  });

  it("UI-INT-008 a created configuration arrives disabled: the switch is off and says so", async () => {
    const user = userEvent.setup();
    let stored: GetHuaweiConfigResponse | undefined;
    const router = routeRequests([
      {
        method: "GET",
        url: configUrl(PLANT_A),
        respond: () => {
          if (!stored) throw apiError(404);
          return stored;
        },
      },
      {
        method: "PUT",
        url: configUrl(PLANT_A),
        respond: (config) => {
          // The backend creates a configuration disabled (lucoenergia/conluz#425).
          const body = config.data as { username: string; baseUrl: string };
          stored = { enabled: false, username: body.username, baseUrl: body.baseUrl, passwordSet: true };
          return undefined;
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
    renderOne();

    await user.click(await screen.findByRole("button", { name: "Configurar" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Usuario"), "huawei-user");
    await user.type(within(dialog).getByLabelText("Contraseña"), "s3cret");
    await user.type(within(dialog).getByLabelText("URL del servicio"), "https://eu5.fusionsolar.huawei.com/thirdData");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(theSwitch()).not.toBeChecked());
    expect(screen.getByText(DISABLED_TEXT)).toBeVisible();
    expect(requestsTo(router.requests, "PUT", configUrl(PLANT_A))[0].data).toEqual({
      username: "huawei-user",
      password: "s3cret",
      baseUrl: "https://eu5.fusionsolar.huawei.com/thirdData",
    });
  });
});
