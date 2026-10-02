import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { buildCommunity, buildCommunityCapabilities, buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import type { CommunityCapabilitiesResponse, PlantCapabilitiesResponse, PlantResponse } from "../../api/models";

// Only the reads are replaced. The actions layer runs for real -- which is the
// point: what is under test is that each card follows the capabilities on the
// payload, and stubbing the action hooks would mean restating that rule in the
// test instead of exercising it. Mutation hooks are inert until called, so the
// one that is stubbed here is stubbed to assert its arguments, not to gate.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllPlants: vi.fn(),
}));
vi.mock(import("../../api/consumption/consumption"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetDatadisConfig: vi.fn(),
  useGetShellyConfig: vi.fn(),
  useConfigureDatadis: vi.fn(),
}));
vi.mock(import("../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetHuaweiConfig: vi.fn(),
  useConfigureHuawei: vi.fn(),
}));

import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { getAllPlants, useGetAllPlants } from "../../api/plants/plants";
import {
  getDatadisConfig,
  getShellyConfig,
  useConfigureDatadis,
  useGetDatadisConfig,
  useGetShellyConfig,
} from "../../api/consumption/consumption";
import { useConfigureHuawei, useGetHuaweiConfig } from "../../api/production/production";
import { IntegrationsPage } from "./IntegrationsPage";

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-1";

const mockConfigureDatadis = vi.fn().mockResolvedValue({});
const mockConfigureHuawei = vi.fn().mockResolvedValue({});

const plant = (capabilities: Partial<PlantCapabilitiesResponse>): PlantResponse =>
  buildPlant({
    id: PLANT_ID,
    name: "Planta Norte",
    community: { id: COMMUNITY_ID },
    capabilities: buildPlantCapabilities({ canRead: true, ...capabilities }),
  });

function setup(
  options: {
    community?: Partial<CommunityCapabilitiesResponse>;
    plants?: PlantResponse[];
    communityLoading?: boolean;
  } = {},
) {
  const { community = {}, plants = [plant({ canManage: true })], communityLoading = false } = options;

  vi.mocked(useGetCommunityById).mockReturnValue(
    communityLoading
      ? query.loading()
      : query.success<typeof getCommunityById>(
          buildCommunity({
            id: COMMUNITY_ID,
            capabilities: buildCommunityCapabilities({ canRead: true, ...community }),
          }),
        ),
  );
  vi.mocked(useGetAllPlants).mockReturnValue(
    query.success<typeof getAllPlants>({
      items: plants,
      size: 1,
      totalElements: plants.length,
      totalPages: 1,
      number: 0,
    }),
  );

  return renderWithProviders(<IntegrationsPage />, { activeCommunityId: COMMUNITY_ID });
}

const card = (name: string) => screen.queryByRole("heading", { name });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGetDatadisConfig).mockReturnValue(
    query.success<typeof getDatadisConfig>({
      enabled: true,
      passwordSet: false,
      username: "datadis-user",
      baseUrl: "https://datadis.example",
    }),
  );
  vi.mocked(useGetShellyConfig).mockReturnValue(query.success<typeof getShellyConfig>({ enabled: false }));
  vi.mocked(useGetHuaweiConfig).mockReturnValue(
    query.success<() => Promise<unknown>>({
      enabled: true,
      username: "huawei-user",
      baseUrl: "https://huawei.example",
    }),
  );
  vi.mocked(useConfigureDatadis).mockReturnValue(mutation.idle({ mutateAsync: mockConfigureDatadis }));
  vi.mocked(useConfigureHuawei).mockReturnValue(mutation.idle({ mutateAsync: mockConfigureHuawei }));
});

describe("IntegrationsPage", () => {
  describe("an admin of the community", () => {
    it("gets every integration it may configure", () => {
      setup({ community: { canManage: true } });

      expect(card("Datadis")).toBeInTheDocument();
      expect(card("Shelly")).toBeInTheDocument();
      expect(card("Huawei")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Guardar" })).toHaveLength(3);
    });

    it("saves through the action, which carries the community it writes into", async () => {
      setup({ community: { canManage: true } });

      const datadis = screen.getByRole("heading", { name: "Datadis" }).closest(".MuiPaper-root") as HTMLElement;
      await userEvent.click(within(datadis).getByRole("button", { name: "Guardar" }));
      // Credentials are community configuration, so the save is confirmed
      // against the community it names first (#186). The gate is still what
      // decides the button exists at all.
      await userEvent.click(within(screen.getByTestId("modal-panel")).getByRole("button", { name: "Guardar" }));

      expect(mockConfigureDatadis).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: COMMUNITY_ID,
          data: expect.objectContaining({ username: "datadis-user" }),
        }),
      );
    });
  });

  describe("a member of the community", () => {
    it("is offered no integration to configure at all", () => {
      // Reading each configuration needs exactly what writing it needs, so
      // there is no read-only card to fall back to.
      setup({ community: { canManage: false }, plants: [plant({ canManage: false })] });

      expect(card("Datadis")).not.toBeInTheDocument();
      expect(card("Shelly")).not.toBeInTheDocument();
      expect(card("Huawei")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
    });
  });

  describe("a platform admin who is not a member of this community", () => {
    it("gets nothing, because the flag is not a grant over a community's data", () => {
      // The platform flag never answers a community capability: the backend
      // reports canManage false, and that is the only thing consulted here.
      setup({ community: { canManage: false }, plants: [] });

      expect(card("Datadis")).not.toBeInTheDocument();
      expect(card("Shelly")).not.toBeInTheDocument();
      expect(card("Huawei")).not.toBeInTheDocument();
    });
  });

  it("decides Huawei from the plant, not from the community", () => {
    // The three forms sit together but do not share a gate: Huawei's endpoint
    // is PUT /plants/{plantId}/production/huawei/config.
    setup({ community: { canManage: true }, plants: [plant({ canManage: false })] });

    expect(card("Datadis")).toBeInTheDocument();
    expect(card("Shelly")).toBeInTheDocument();
    expect(card("Huawei")).not.toBeInTheDocument();
  });

  it("drops the Huawei card when the community has no plant to configure", () => {
    // Known gap, recorded rather than papered over: there is no plant to carry
    // the answer, so the card goes without an explanation. The per-plant
    // section that replaces this card owns that empty state -- and this is also
    // what stops the old PUT /api/v1/plants//production/huawei/config.
    setup({ community: { canManage: true }, plants: [] });

    expect(card("Huawei")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Guardar" })).toHaveLength(2);
  });

  it("counts only the cards it actually shows", () => {
    setup({ community: { canManage: true }, plants: [] });

    expect(screen.getByText("1 de 2 integraciones activas")).toBeInTheDocument();
  });

  it("offers nothing while the community has not loaded -- not yet known is not 'no'", () => {
    // The plant is deliberately permissive, so the only unresolved answer is
    // the community's.
    setup({ communityLoading: true, plants: [plant({ canManage: true })] });

    expect(card("Datadis")).not.toBeInTheDocument();
    expect(card("Shelly")).not.toBeInTheDocument();
    expect(screen.getByText("Comprobando integraciones…")).toBeInTheDocument();
  });
});
