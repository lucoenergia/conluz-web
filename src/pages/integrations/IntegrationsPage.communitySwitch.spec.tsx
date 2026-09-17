import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type FC, type ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "../../theme";
import { ActiveCommunityContext } from "../../context/community.context";

const CONFIG_BY_COMMUNITY: Record<string, { username: string; baseUrl: string }> = {
  "community-a": { username: "datadis-a", baseUrl: "https://a.example" },
  "community-b": { username: "datadis-b", baseUrl: "https://b.example" },
};

const mockConfigureDatadis = vi.fn().mockResolvedValue({});

vi.mock("../../api/plants/plants", () => ({
  useGetAllPlants: () => ({ data: { items: [] }, isLoading: false }),
}));

vi.mock("../../api/consumption/consumption", () => ({
  useGetShellyConfig: () => ({ data: { enabled: false }, isLoading: false }),
  useGetDatadisConfig: (communityId: string) => ({
    data: { enabled: true, ...CONFIG_BY_COMMUNITY[communityId] },
    isLoading: false,
  }),
  useConfigureDatadis: () => ({ mutateAsync: mockConfigureDatadis }),
  useConfigureShelly: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  getGetDatadisConfigQueryKey: (communityId: string) => [`/datadis/${communityId}`],
  getGetShellyConfigQueryKey: (communityId: string) => [`/shelly/${communityId}`],
}));

vi.mock("../../api/production/production", () => ({
  useGetHuaweiConfig: () => ({ data: undefined, isLoading: false }),
  useConfigureHuawei: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  getGetHuaweiConfigQueryKey: (plantId: string) => [`/huawei/${plantId}`],
}));

import { IntegrationsPage } from "./IntegrationsPage";

/**
 * Mirrors how AuthenticatedLayout renders the routed page: keyed on the active
 * community, so a switch remounts it. The assertion below is about this page's
 * own latch (`configLoaded`), which a remount is only able to clear because the
 * latch lives in component state and not in a module-level or ref cache.
 */
const KeyedPage: FC<{ communityId: string }> = ({ communityId }) => (
  <ActiveCommunityContext.Provider value={communityId}>
    <IntegrationsPage key={communityId} />
  </ActiveCommunityContext.Provider>
);

function renderPage(communityId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (id: string): ReactNode => (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <KeyedPage communityId={id} />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
  const { rerender } = render(tree(communityId));
  return { switchTo: (id: string) => rerender(tree(id)) };
}

function datadisCard(): HTMLElement {
  return screen.getByText("Datadis").closest(".MuiPaper-root") as HTMLElement;
}

describe("IntegrationsPage across a community switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
