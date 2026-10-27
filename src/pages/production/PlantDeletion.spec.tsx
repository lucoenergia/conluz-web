import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlantsPage } from "./PlantsPage";
import { ErrorDisplay } from "../../components/Errors/ErrorDisplay";
import { SuccessDisplay } from "../../components/Success/SuccessDisplay";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { VISIBLE } from "../../test/visibleText";
import { buildCommunity, buildCommunityCapabilities, buildPlant, buildPlantCapabilities } from "../../test/fixtures";

/**
 * A plant deleted from the plant list (#311). The list refreshes once the
 * deletion succeeds, and the deleted plant's card leaves it -- so whatever
 * confirms the deletion must outlive the card.
 *
 * Tier 2: the subject is what survives the list refetch, so the real action
 * hook and QueryClient run, with only the HTTP layer mocked.
 */
const COMMUNITY_ID = "community-1";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const PLANTS_URL = `${COMMUNITY_URL}/plants`;

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: "Comunidad Solar",
  capabilities: buildCommunityCapabilities({ canRead: true }),
});

const NORTH = buildPlant({
  id: "plant-north",
  name: "Planta Norte",
  providerCode: "NE=1",
  community: { id: COMMUNITY_ID },
  capabilities: buildPlantCapabilities({ canRead: true, canManage: true }),
});

const SOUTH = buildPlant({
  id: "plant-south",
  name: "Planta Sur",
  providerCode: "NE=2",
  community: { id: COMMUNITY_ID },
  capabilities: buildPlantCapabilities({ canRead: true, canManage: true }),
});

const SUCCESS = "Planta NE=1 eliminada.";

function renderPlants(deleteNorth: () => unknown) {
  let deleted = false;
  const router = routeRequests([
    { method: "GET", url: COMMUNITY_URL, respond: () => COMMUNITY },
    {
      method: "GET",
      url: PLANTS_URL,
      respond: () => {
        const items = deleted ? [SOUTH] : [NORTH, SOUTH];
        return { items, size: 10000, totalElements: items.length, totalPages: 1, number: 0 };
      },
    },
    {
      method: "DELETE",
      url: `/api/v1/plants/${NORTH.id}`,
      respond: () => {
        const answer = deleteNorth();
        deleted = true;
        return answer;
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  renderWithProviders(
    <>
      <PlantsPage />
      <ErrorDisplay />
      <SuccessDisplay />
    </>,
    { route: "/production", activeCommunityId: COMMUNITY_ID },
  );
  return { router };
}

async function deleteNorthPlant(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Más acciones para Planta Norte" }));
  await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
  await screen.findByRole("heading", { name: /^Eliminar planta de / });
  await user.click(screen.getByRole("button", { name: "Eliminar" }));
}

describe("deleting a plant from the plant list", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("UI-PLT-009 announces the deletion after the plant's card has left the list", async () => {
    const user = userEvent.setup();
    renderPlants(() => undefined);

    await deleteNorthPlant(user);

    // The refetched list no longer has the plant, so its card is gone...
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Planta Norte" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Planta Sur" })).toBeInTheDocument();
    // ...and the confirmation is still there, because the page owns it.
    expect(await screen.findByText(SUCCESS, VISIBLE)).toBeInTheDocument();
  });

  it("UI-PLT-009 announces no success when the deletion is refused", async () => {
    const user = userEvent.setup();
    renderPlants(() => {
      throw apiError(500);
    });

    await deleteNorthPlant(user);

    expect(
      await screen.findByText("Ha habido un problema al eliminar la planta. Por favor inténtalo más tarde"),
    ).toBeInTheDocument();
    // Neither shown nor announced: the live region carries the same text.
    expect(screen.queryAllByText(SUCCESS)).toEqual([]);
    expect(screen.getByRole("heading", { name: "Planta Norte" })).toBeInTheDocument();
  });
});
