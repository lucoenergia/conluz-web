import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildCommunityCapabilities, buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import type { CommunityCapabilitiesResponse, PlantCapabilitiesResponse } from "../../api/models";

// Only the reads are replaced. The actions layer runs for real -- which is the
// point: what is under test is that a card's menu and the page's buttons follow
// the capabilities on the payload, and stubbing the action hooks would mean
// restating that rule in the test instead of exercising it. Mutation hooks are
// inert until called, so leaving them real reaches no network.
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllPlants: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

import { getAllPlants, useGetAllPlants } from "../../api/plants/plants";
import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { PlantsPage } from "./PlantsPage";

const COMMUNITY_ID = "community-a";
const NEW_BUTTON = "Nueva Planta";
const MENU_BUTTON = "Más acciones para Planta Norte";

const plant = (capabilities: Partial<PlantCapabilitiesResponse>, overrides = {}) =>
  buildPlant({
    id: "plant-1",
    name: "Planta Norte",
    providerCode: "NE=1",
    community: { id: COMMUNITY_ID },
    capabilities: buildPlantCapabilities({ canRead: true, ...capabilities }),
    ...overrides,
  });

function setup(options: {
  community?: Partial<CommunityCapabilitiesResponse>;
  plants?: ReturnType<typeof plant>[];
  communityLoading?: boolean;
} = {}) {
  const { community = {}, plants = [plant({})], communityLoading = false } = options;

  vi.mocked(useGetCommunityById).mockReturnValue(
    communityLoading
      ? query.loading()
      : query.success<typeof getCommunityById>(
          buildCommunity({
            id: COMMUNITY_ID,
            capabilities: buildCommunityCapabilities({ canRead: true, canListPlants: true, ...community }),
          }),
        ),
  );
  vi.mocked(useGetAllPlants).mockReturnValue(
    query.success<typeof getAllPlants>({
      items: plants,
      size: 10000,
      totalElements: plants.length,
      totalPages: 1,
      number: 0,
    }),
  );

  return renderWithProviders(<PlantsPage />, { activeCommunityId: COMMUNITY_ID });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlantsPage", () => {
  describe("a member of the community", () => {
    it("is not offered a way to create a plant", () => {
      setup({ community: { canCreatePlants: false } });

      expect(screen.queryByRole("link", { name: NEW_BUTTON })).not.toBeInTheDocument();
    });

    it("gets a card with no actions menu for a plant they may only read", () => {
      setup({ community: { canCreatePlants: false }, plants: [plant({})] });

      expect(screen.queryByRole("button", { name: MENU_BUTTON })).not.toBeInTheDocument();
      expect(screen.getByText("Planta Norte")).toBeInTheDocument();
    });

    it("gets an empty state that does not tell them to add one", () => {
      setup({ community: { canCreatePlants: false }, plants: [] });

      expect(screen.getByText("Todavía no hay ninguna planta de producción en esta comunidad.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Crear Planta" })).not.toBeInTheDocument();
    });
  });

  describe("an admin of the community", () => {
    it("is offered a way to create a plant", () => {
      setup({ community: { canCreatePlants: true } });

      expect(screen.getByRole("link", { name: NEW_BUTTON })).toHaveAttribute("href", "/production/new");
    });

    it("gets a card with the actions menu", () => {
      setup({ community: { canCreatePlants: true }, plants: [plant({ canManage: true })] });

      expect(screen.getByRole("button", { name: MENU_BUTTON })).toBeInTheDocument();
    });

    it("gets an empty state that offers to create the first one", () => {
      setup({ community: { canCreatePlants: true }, plants: [] });

      expect(screen.getByText("Comienza agregando tu primera planta de producción")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Crear Planta" })).toBeInTheDocument();
    });
  });

  it("decides each card from its own plant, not from the community", () => {
    setup({
      community: { canCreatePlants: true },
      plants: [
        plant({ canManage: true }),
        plant({}, { id: "plant-2", name: "Planta Sur", providerCode: "NE=2" }),
      ],
    });

    expect(screen.getByRole("button", { name: MENU_BUTTON })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Más acciones para Planta Sur" })).not.toBeInTheDocument();
  });

  it("offers nothing while the community has not loaded -- not yet known is not 'no'", () => {
    setup({ communityLoading: true });

    expect(screen.queryByRole("link", { name: NEW_BUTTON })).not.toBeInTheDocument();
  });
});
