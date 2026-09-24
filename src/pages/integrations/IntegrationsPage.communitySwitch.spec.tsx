import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { useActiveCommunity } from "../../context/community.context";
import { useGetAllPlants, type getAllPlants } from "../../api/plants/plants";
import {
  useConfigureDatadis,
  useConfigureShelly,
  useGetDatadisConfig,
  useGetShellyConfig,
  type getDatadisConfig,
  type getShellyConfig,
} from "../../api/consumption/consumption";
import { useConfigureHuawei, useGetHuaweiConfig } from "../../api/production/production";

const CONFIG_BY_COMMUNITY: Record<string, { username: string; baseUrl: string }> = {
  "community-a": { username: "datadis-a", baseUrl: "https://a.example" },
  "community-b": { username: "datadis-b", baseUrl: "https://b.example" },
};

const mockConfigureDatadis = vi.fn().mockResolvedValue({});

vi.mock(import("../../api/plants/plants"), () => ({
  useGetAllPlants: vi.fn(),
}));

vi.mock(import("../../api/consumption/consumption"), () => ({
  useGetShellyConfig: vi.fn(),
  useGetDatadisConfig: vi.fn(),
  useConfigureDatadis: vi.fn(),
  useConfigureShelly: vi.fn(),
  getGetDatadisConfigQueryKey: (communityId: string) => [`/api/v1/communities/${communityId}/config/datadis`] as const,
  getGetShellyConfigQueryKey: (communityId: string) => [`/api/v1/communities/${communityId}/config/shelly`] as const,
}));

vi.mock(import("../../api/production/production"), () => ({
  useGetHuaweiConfig: vi.fn(),
  useConfigureHuawei: vi.fn(),
  getGetHuaweiConfigQueryKey: (plantId: string) => [`/api/v1/plants/${plantId}/production/huawei/config`] as const,
}));

import { IntegrationsPage } from "./IntegrationsPage";

/**
 * Mirrors how AuthenticatedLayout renders the routed page: keyed on the active
 * community, so a switch remounts it. The assertion below is about this page's
 * own latch (`configLoaded`), which a remount is only able to clear because the
 * latch lives in component state and not in a module-level or ref cache.
 */
function KeyedPage() {
  const communityId = useActiveCommunity();
  return <IntegrationsPage key={communityId} />;
}

function renderPage(communityId: string) {
  const { switchActiveCommunity } = renderWithProviders(<KeyedPage />, { activeCommunityId: communityId });
  return { switchTo: (id: string) => switchActiveCommunity(id) };
}

function datadisCard(): HTMLElement {
  return screen.getByText("Datadis").closest(".MuiPaper-root") as HTMLElement;
}

describe("IntegrationsPage across a community switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAllPlants).mockReturnValue(query.success<typeof getAllPlants>({ items: [] }));
    vi.mocked(useGetShellyConfig).mockReturnValue(query.success<typeof getShellyConfig>({ enabled: false }));
    vi.mocked(useGetDatadisConfig).mockImplementation((communityId) =>
      // passwordSet is required by the schema; false renders the same as the
      // field's previous absence (no "password saved" hint).
      query.success<typeof getDatadisConfig>({ enabled: true, passwordSet: false, ...CONFIG_BY_COMMUNITY[communityId] }),
    );
    // No plants, so the page disables the Huawei config query (enabled: !!firstPlantId).
    vi.mocked(useGetHuaweiConfig).mockReturnValue(query.disabled());
    vi.mocked(useConfigureDatadis).mockReturnValue(mutation.idle({ mutateAsync: mockConfigureDatadis }));
    vi.mocked(useConfigureShelly).mockReturnValue(mutation.idle({ mutateAsync: vi.fn().mockResolvedValue({}) }));
    vi.mocked(useConfigureHuawei).mockReturnValue(mutation.idle({ mutateAsync: vi.fn().mockResolvedValue({}) }));
  });

  it("shows the newly selected community's Datadis credentials", async () => {
    const { switchTo } = renderPage("community-a");
    await waitFor(() => {
      expect(within(datadisCard()).getByLabelText("Usuario")).toHaveValue("datadis-a");
    });

    switchTo("community-b");

    await waitFor(() => {
      expect(within(datadisCard()).getByLabelText("Usuario")).toHaveValue("datadis-b");
    });
  });

  // The bug this replaces: `configLoaded.datadis` stayed true across the switch,
  // so the form kept community A's credentials and Guardar posted them to
  // community B -- a silent cross-community credential write.
  it("saves the new community's values, not the previous community's", async () => {
    const { switchTo } = renderPage("community-a");
    await waitFor(() => {
      expect(within(datadisCard()).getByLabelText("Usuario")).toHaveValue("datadis-a");
    });

    switchTo("community-b");
    await waitFor(() => {
      expect(within(datadisCard()).getByLabelText("Usuario")).toHaveValue("datadis-b");
    });

    await userEvent.click(within(datadisCard()).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockConfigureDatadis).toHaveBeenCalled());
    expect(mockConfigureDatadis).toHaveBeenCalledWith(
      expect.objectContaining({
        communityId: "community-b",
        data: expect.objectContaining({ username: "datadis-b", baseUrl: "https://b.example" }),
      }),
    );
  });
});
