import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlantsPage } from "./PlantsPage";
import { ErrorDisplay } from "../../components/Errors/ErrorDisplay";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCommunityCapabilities, buildPlant, buildPlantCapabilities } from "../../test/fixtures";

/**
 * A refused plant deletion on the plant list (#290). A plant that holds the
 * community's sharing history is refused for good (lucoenergia/conluz#437), so
 * the page says it must be kept and suggests no retry; any other failure keeps
 * the generic message.
 *
 * Tier 2: the subject includes that the plant list is not refetched, so the
 * real action hook and QueryClient run, with only the HTTP layer mocked.
 */
const COMMUNITY_ID = "community-1";
const PLANT_ID = "plant-1";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const PLANTS_URL = `${COMMUNITY_URL}/plants`;
const PLANT_URL = `/api/v1/plants/${PLANT_ID}`;

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: "Comunidad Solar",
  capabilities: buildCommunityCapabilities({ canRead: true }),
});

const PLANT = buildPlant({
  id: PLANT_ID,
  name: "Planta Norte",
  community: { id: COMMUNITY_ID },
  capabilities: buildPlantCapabilities({ canRead: true, canManage: true }),
});

function renderRefused(error: unknown) {
  let plantsServed = 0;
  const router = routeRequests([
    { method: "GET", url: COMMUNITY_URL, respond: () => COMMUNITY },
    {
      method: "GET",
      url: PLANTS_URL,
      respond: () => {
        plantsServed += 1;
        return { items: [PLANT], size: 10000, totalElements: 1, totalPages: 1, number: 0 };
      },
    },
    {
      method: "DELETE",
      url: PLANT_URL,
      respond: () => {
        throw error;
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  renderWithProviders(
    <>
      <PlantsPage />
      <ErrorDisplay />
    </>,
    { route: "/production", activeCommunityId: COMMUNITY_ID },
  );
  return { router, plantsServed: () => plantsServed };
}

async function deletePlant(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Más acciones para Planta Norte" }));
  await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
  await screen.findByRole("heading", { name: /^Eliminar planta de / });
  await user.click(screen.getByRole("button", { name: "Eliminar" }));
}

describe("a refused plant deletion", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it.each([
    ["PLANT_HAS_SHARING_AGREEMENTS", "tiene acuerdos de reparto"],
    ["PLANT_HAS_PARTITION_COEFFICIENTS", "tiene coeficientes de reparto"],
  ] as const)("UI-PLT-008 a 409 %s says the plant must be kept, suggests no retry, and keeps it", async (code, reason) => {
    const user = userEvent.setup();
    const { router, plantsServed } = renderRefused(apiError(409, { code }));

    await deletePlant(user);

    const message = await screen.findByText(new RegExp(reason));
    expect(message).toHaveTextContent("guarda el historial de reparto de la comunidad y hay que conservarla");
    expect(message).not.toHaveTextContent(/inténtalo/i);
    expect(router.requests.filter((request) => request.method === "DELETE")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Planta Norte" })).toBeInTheDocument();
    // Nothing was deleted, so the list was not read again.
    expect(plantsServed()).toBe(1);
  });

  it("UI-PLT-008 keeps the generic message for any other failure", async () => {
    const user = userEvent.setup();
    renderRefused(apiError(500));

    await deletePlant(user);

    expect(
      await screen.findByText("Ha habido un problema al eliminar la planta. Por favor inténtalo más tarde"),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Planta Norte" })).toBeInTheDocument());
  });
});
