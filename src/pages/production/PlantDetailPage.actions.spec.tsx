import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { PlantDetailPage } from "./PlantDetailPage";
import { ErrorDisplay } from "../../components/Errors/ErrorDisplay";
import { SuccessDisplay } from "../../components/Success/SuccessDisplay";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildPlant, buildPlantCapabilities, buildSupplyReference } from "../../test/fixtures";
import { VISIBLE } from "../../test/visibleText";
import type { PlantEnergyMetricsResponse } from "../../api/models";

/**
 * Editing and deleting a plant from its own detail (UI-PLT-014): both open from
 * the header's menu, over the page. Once a deleted plant is gone the page has
 * nothing left to show, so it returns to the plant list, replacing its own
 * history entry.
 *
 * Tier 2: the subject includes what the page reads after the DELETE -- a
 * refetch of the deleted plant could only answer 404 -- so the real action
 * hook and QueryClient run, with only the HTTP layer mocked.
 */
const COMMUNITY_ID = "community-1";
const PLANT_ID = "plant-1";
const PLANT_URL = `/api/v1/plants/${PLANT_ID}`;

const { mockCustomInstance, navigations } = vi.hoisted(() => ({
  mockCustomInstance: vi.fn(),
  navigations: [] as unknown[][],
}));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

// The real overlay navigation, recorded: whether it replaced the detail's entry
// is in its arguments, and its own spec covers what it does with them.
vi.mock(import("../../components/ResponsiveOverlay"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    useOverlayNavigate: () => {
      const navigate = original.useOverlayNavigate();
      return (...args: Parameters<typeof navigate>) => {
        navigations.push(args);
        return navigate(...args);
      };
    },
  };
});

// jsdom has no layout, and ApexCharts measures its container on mount.
vi.mock("react-apexcharts", () => ({ default: () => null }));

const PLANT = buildPlant({
  id: PLANT_ID,
  name: "Planta Norte",
  address: "Calle Sol 1",
  supply: buildSupplyReference({ id: "supply-7", code: "ES0031300806333002ET0F" }),
  community: { id: COMMUNITY_ID },
  capabilities: buildPlantCapabilities({ canRead: true, canManage: true }),
});

/** No production day yet: the period section shows its notice, and asks nothing more. */
const NO_PRODUCTION_DAY: PlantEnergyMetricsResponse = {
  period: { startDate: null, endDate: null },
  energy: { productionKWh: null },
  coverage: { hoursWithData: 0, expectedHours: 0 },
};

const page = <T,>(items: T[]) => ({ items, size: items.length, totalElements: items.length, totalPages: 1, number: 0 });

function renderDetail(onDelete: () => unknown) {
  const router = routeRequests([
    { method: "GET", url: PLANT_URL, respond: () => PLANT },
    { method: "GET", url: `/api/v1/communities/${COMMUNITY_ID}`, respond: () => buildCommunity({ id: COMMUNITY_ID }) },
    // What the page's sections read about the plant; not the subject.
    {
      method: "GET",
      url: new RegExp(`^${PLANT_URL}/production/huawei/config$`),
      respond: () => {
        throw apiError(404);
      },
    },
    { method: "GET", url: new RegExp(`^${PLANT_URL}/sharing-agreements`), respond: () => [] },
    { method: "GET", url: `${PLANT_URL}/energy-metrics`, respond: () => NO_PRODUCTION_DAY },
    // The edit form's supply selector.
    { method: "GET", url: `/api/v1/communities/${COMMUNITY_ID}/supplies`, respond: () => page([]) },
    { method: "DELETE", url: PLANT_URL, respond: onDelete },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  renderWithProviders(
    <>
      <Routes>
        <Route path="plants" element={<h1>Lista de plantas</h1>} />
        <Route path="plants/:plantId" element={<PlantDetailPage />} />
      </Routes>
      <ErrorDisplay />
      <SuccessDisplay />
    </>,
    { route: `/plants/${PLANT_ID}`, activeCommunityId: COMMUNITY_ID },
  );
  return router;
}

async function choose(user: ReturnType<typeof userEvent.setup>, item: string) {
  await user.click(await screen.findByRole("button", { name: "Más opciones de la planta" }));
  await user.click(screen.getByRole("menuitem", { name: item }));
}

async function confirmDeletion(user: ReturnType<typeof userEvent.setup>) {
  await choose(user, "Eliminar planta");
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
}

const isPlantRead = (request: RequestConfig) =>
  (request.method ?? "GET").toUpperCase() === "GET" && request.url === PLANT_URL;

beforeEach(() => {
  mockCustomInstance.mockReset();
  navigations.length = 0;
});

describe("UI-PLT-014 editing a plant from its detail", () => {
  it("UI-PLT-014 opens the edit form over the detail, which stays where it is", async () => {
    const user = userEvent.setup();
    renderDetail(() => undefined);

    await choose(user, "Editar planta");

    expect(await screen.findByRole("dialog", { name: "Editar planta" })).toBeInTheDocument();
    // Behind the open dialog, so out of the accessibility tree, but still there.
    expect(screen.getByRole("heading", { level: 1, name: "Planta Norte", hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lista de plantas", hidden: true })).not.toBeInTheDocument();
  });

  it("UI-PLT-014 returns focus to the menu's button once the form closes", async () => {
    const user = userEvent.setup();
    renderDetail(() => undefined);

    await choose(user, "Editar planta");
    const dialog = await screen.findByRole("dialog", { name: "Editar planta" });
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "Más opciones de la planta" })).toHaveFocus());
  });
});

describe("UI-PLT-014 deleting a plant from its detail", () => {
  it("UI-PLT-014 UI-PLT-009 returns to the plant list in place of the detail, without reading the deleted plant again", async () => {
    const user = userEvent.setup();
    const router = renderDetail(() => undefined);

    await confirmDeletion(user);

    expect(await screen.findByRole("heading", { name: "Lista de plantas" })).toBeInTheDocument();
    expect(await screen.findByText("Planta «Planta Norte» eliminada.", VISIBLE)).toBeInTheDocument();
    expect(navigations).toEqual([["/plants", { replace: true }]]);
    const deleteAt = router.requests.findIndex((request) => request.method === "DELETE");
    expect(deleteAt).toBeGreaterThan(-1);
    expect(router.requests.slice(deleteAt + 1).filter(isPlantRead)).toHaveLength(0);
  });

  it("UI-PLT-014 returns to the list on a 404, because the plant is already gone", async () => {
    const user = userEvent.setup();
    renderDetail(() => {
      throw apiError(404);
    });

    await confirmDeletion(user);

    expect(await screen.findByRole("heading", { name: "Lista de plantas" })).toBeInTheDocument();
    expect(navigations).toEqual([["/plants", { replace: true }]]);
  });

  it("UI-PLT-014 UI-PLT-008 stays on the detail when the deletion is refused, and says why", async () => {
    const user = userEvent.setup();
    renderDetail(() => {
      throw apiError(409, { code: "PLANT_HAS_SHARING_AGREEMENTS" });
    });

    await confirmDeletion(user);

    expect(await screen.findByText(/tiene acuerdos de reparto/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Planta Norte" })).toBeInTheDocument();
    expect(navigations).toEqual([]);
  });
});
