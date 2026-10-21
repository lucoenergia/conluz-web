import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { SupplyDetailPage } from "./SupplyDetailPage";
import { ErrorDisplay } from "../../components/Errors/ErrorDisplay";
import { SuccessDisplay } from "../../components/Success/SuccessDisplay";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { buildSupply, buildSupplyCapabilities, buildUser } from "../../test/fixtures";

/**
 * Deleting a supply from its detail page (#290): once the supply is gone the
 * page has nothing left to show, so it returns to the supply list.
 *
 * Tier 2: the subject includes what the page reads after the DELETE -- a
 * refetch of the deleted supply could only answer 404 -- so the real action
 * hook and QueryClient run, with only the HTTP layer mocked.
 */
const COMMUNITY_ID = "community-1";
const SUPPLY_ID = "supply-1";
const SUPPLY_URL = `/api/v1/supplies/${SUPPLY_ID}`;
// The page's consumption and production series, which are not the subject.
const SERIES_URL = new RegExp(`^${SUPPLY_URL}/(consumption|production)/`);

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

// The charts need a layout engine jsdom does not have, and are not the subject.
vi.mock("react-apexcharts", () => ({ default: () => <div /> }));

const SUPPLY = buildSupply({
  id: SUPPLY_ID,
  code: "ES0031406912345678JN0F",
  name: "Casa de Lucía",
  user: buildUser({ id: "owner-1", fullName: "Lucía Martínez Soler" }),
  community: { id: COMMUNITY_ID, name: "Comunidad Solar" },
  capabilities: buildSupplyCapabilities({ canEdit: true, canDelete: true }),
});

function renderDetail(onDelete: () => unknown) {
  const router = routeRequests([
    { method: "GET", url: SUPPLY_URL, respond: () => SUPPLY },
    { method: "GET", url: SERIES_URL, respond: () => [] },
    { method: "DELETE", url: SUPPLY_URL, respond: onDelete },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  renderWithProviders(
    <>
      <Routes>
        <Route path="supply-points" element={<h1>Lista de puntos de suministro</h1>} />
        <Route path="supply-points/:supplyPointId" element={<SupplyDetailPage />} />
      </Routes>
      <ErrorDisplay />
      <SuccessDisplay />
    </>,
    { route: `/supply-points/${SUPPLY_ID}`, activeCommunityId: COMMUNITY_ID },
  );
  return router;
}

async function confirmDeletion(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Más opciones del punto de suministro" }));
  await user.click(screen.getByRole("menuitem", { name: "Eliminar punto de suministro" }));
  await screen.findByRole("heading", { name: /^Eliminar punto de suministro de / });
  await user.click(screen.getByRole("button", { name: "Eliminar" }));
}

const isSupplyRead = (request: RequestConfig) =>
  (request.method ?? "GET").toUpperCase() === "GET" && request.url === SUPPLY_URL;

describe("deleting a supply from its detail page", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("UI-SUP-003 returns to the supply list, without reading the deleted supply again", async () => {
    const user = userEvent.setup();
    const router = renderDetail(() => undefined);

    await confirmDeletion(user);

    expect(await screen.findByRole("heading", { name: "Lista de puntos de suministro" })).toBeInTheDocument();
    expect(await screen.findByText("Punto de suministro ES0031406912345678JN0F eliminado.")).toBeInTheDocument();
    const deleteAt = router.requests.findIndex((request) => request.method === "DELETE");
    expect(deleteAt).toBeGreaterThan(-1);
    expect(router.requests.slice(deleteAt + 1).filter(isSupplyRead)).toHaveLength(0);
  });

  it("UI-SUP-004 returns to the list on a 404, because the supply is already gone", async () => {
    const user = userEvent.setup();
    renderDetail(() => {
      throw apiError(404);
    });

    await confirmDeletion(user);

    expect(await screen.findByRole("heading", { name: "Lista de puntos de suministro" })).toBeInTheDocument();
    expect(
      await screen.findByText("Este punto de suministro ya no existe. Hemos actualizado la lista."),
    ).toBeInTheDocument();
  });

  it("UI-SUP-004 stays on the page when the deletion is refused, and says why", async () => {
    const user = userEvent.setup();
    renderDetail(() => {
      throw apiError(409, { code: "SUPPLY_HAS_PLANTS" });
    });

    await confirmDeletion(user);

    expect(await screen.findByText(/tiene una planta asociada/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casa de Lucía" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lista de puntos de suministro" })).not.toBeInTheDocument();
  });
});
