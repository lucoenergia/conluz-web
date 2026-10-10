import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { useActiveCommunity } from "../../context/community.context";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser } from "../../test/fixtures";

const CONFIG_BY_COMMUNITY: Record<string, { username: string; baseUrl: string }> = {
  "community-a": { username: "datadis-a", baseUrl: "https://a.example" },
  "community-b": { username: "datadis-b", baseUrl: "https://b.example" },
};

const mockConfigureDatadis = vi.fn().mockResolvedValue({});

// Only the reads are replaced, plus the one mutation this file asserts the
// arguments of. The actions layer runs for real, so the cards here exist for
// the same reason they exist in the app: the community answered canManage.
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllPlants: vi.fn(),
}));

// useActiveCommunityResource reads this, and it now re-keys on the switch too:
// the Datadis card depends on the NEW community's canManage, not the old one's.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
  useGetAllCommunities: vi.fn(),
}));

// useGetSuppliesByUserId is read by the harness's real CommunityProvider, for the
// first-time rule (#237). The community is seeded here, so the provider's own
// choice is never what the page sees; its read is left unanswered.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));

vi.mock(import("../../api/consumption/consumption"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetShellyConfig: vi.fn(),
  useGetDatadisConfig: vi.fn(),
  useConfigureDatadis: vi.fn(),
}));

vi.mock(import("../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetHuaweiConfig: vi.fn(),
}));

// useActiveCommunityName -> useActiveCommunityDetails reads the caller's
// memberships, so the confirmation can name the community it is about to write
// into (#186).
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () =>
    buildCurrentUser({
      id: "admin",
      memberships: { "community-a": "COMMUNITY_ADMIN", "community-b": "COMMUNITY_ADMIN" },
    }),
}));

import { useGetAllPlants, type getAllPlants } from "../../api/plants/plants";
import { useGetSuppliesByUserId } from "../../api/users/users";
import {
  getAllCommunities,
  getCommunityById,
  useGetAllCommunities,
  useGetCommunityById,
} from "../../api/communities/communities";
import {
  useConfigureDatadis,
  useGetDatadisConfig,
  useGetShellyConfig,
  type getDatadisConfig,
  type getShellyConfig,
} from "../../api/consumption/consumption";
import { useGetHuaweiConfig } from "../../api/production/production";
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

/** The save confirmation, by BasicModal's interim test id until the panel gets a dialog role. */
function confirmation(): HTMLElement {
  return screen.getByTestId("modal-panel");
}

describe("IntegrationsPage across a community switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
    vi.mocked(useGetCommunityById).mockImplementation((communityId) =>
      query.success<typeof getCommunityById>(
        buildCommunity({
          id: communityId,
          capabilities: buildCommunityCapabilities({ canRead: true, canManage: true }),
        }),
      ),
    );
    vi.mocked(useGetAllPlants).mockReturnValue(query.success<typeof getAllPlants>({ items: [] }));
    vi.mocked(useGetShellyConfig).mockReturnValue(query.success<typeof getShellyConfig>({ enabled: false }));
    vi.mocked(useGetDatadisConfig).mockImplementation((communityId) =>
      // passwordSet is required by the schema; false renders the same as the
      // field's previous absence (no "password saved" hint).
      query.success<typeof getDatadisConfig>({ enabled: true, passwordSet: false, ...CONFIG_BY_COMMUNITY[communityId] }),
    );
    // No plants, so the page disables the Huawei config query (enabled: !!firstPlantId)
    // and, now, mounts no Huawei card at all -- there is no plant to carry the
    // canManage that one is gated on.
    vi.mocked(useGetHuaweiConfig).mockReturnValue(query.disabled());
    vi.mocked(useConfigureDatadis).mockReturnValue(mutation.idle({ mutateAsync: mockConfigureDatadis }));
    vi.mocked(useGetAllCommunities).mockReturnValue(
      query.success<typeof getAllCommunities>([
        buildCommunity({ id: "community-a", name: "Comunidad Alpha" }),
        buildCommunity({ id: "community-b", name: "Comunidad Beta" }),
      ]),
    );
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
    await userEvent.click(within(confirmation()).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockConfigureDatadis).toHaveBeenCalled());
    expect(mockConfigureDatadis).toHaveBeenCalledWith(
      expect.objectContaining({
        communityId: "community-b",
        data: expect.objectContaining({ username: "datadis-b", baseUrl: "https://b.example" }),
      }),
    );
  });

  it("AC9: saving asks for confirmation naming the community, and writes nothing until confirmed", async () => {
    const user = userEvent.setup();
    renderPage("community-b");
    await waitFor(() => {
      expect(within(datadisCard()).getByLabelText("Usuario")).toHaveValue("datadis-b");
    });

    await user.click(within(datadisCard()).getByRole("button", { name: "Guardar" }));

    expect(screen.getByRole("heading", { name: "Guardar integración en Comunidad Beta" })).toBeInTheDocument();
    expect(within(confirmation()).getByText("Comunidad · Comunidad Beta")).toBeInTheDocument();
    expect(within(confirmation()).getByText("Datadis")).toBeInTheDocument();
    expect(mockConfigureDatadis).not.toHaveBeenCalled();

    await user.click(within(confirmation()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /^Guardar integración/ })).not.toBeInTheDocument(),
    );
    expect(mockConfigureDatadis).not.toHaveBeenCalled();
  });
});
