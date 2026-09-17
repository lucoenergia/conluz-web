import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "../../theme";
import { ActiveCommunityContext } from "../../context/community.context";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";

const PLANT: PlantResponse = {
  id: "plant-a",
  providerCode: "PC-1",
  name: "Planta Norte",
  address: "Calle Uno",
  totalPower: 10,
  community: { id: "community-a" },
} as PlantResponse;

const AGREEMENTS: SharingAgreementResponse[] = [
  {
    id: "agreement-1",
    name: "Acuerdo vigente",
    status: SharingAgreementResponseStatus.PUBLISHED,
  } as SharingAgreementResponse,
];

vi.mock("../../api/plants/plants", () => ({
  useGetPlantById: () => ({ data: PLANT, isLoading: false, error: null, refetch: vi.fn() }),
}));

vi.mock("../../api/sharing-agreements/sharing-agreements", () => ({
  useGetSharingAgreements: () => ({ data: AGREEMENTS, isLoading: false, error: null }),
  useGetSharingAgreementById: () => ({ data: AGREEMENTS[0], isLoading: false, error: null }),
  useGetSharingAgreementPartitionCoefficients: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => vi.fn(),
}));

vi.mock("./useSharingAgreementMutations", () => ({
  useSharingAgreementMutations: () => ({
    createAgreement: vi.fn(),
    updateAgreement: vi.fn(),
    deleteAgreement: vi.fn(),
    publishAgreement: vi.fn(),
    revertAgreementToDraft: vi.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isPublishing: false,
    isReverting: false,
  }),
}));

import { SharingAgreementsPage } from "./SharingAgreementsPage";

function renderPage(activeCommunityId: string | null): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree: ReactNode = (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <ActiveCommunityContext.Provider value={activeCommunityId}>
          <MemoryRouter initialEntries={["/production/plant-a/sharing-agreements"]}>
            <Routes>
              <Route path="/production/:plantId/sharing-agreements" element={<SharingAgreementsPage />} />
            </Routes>
          </MemoryRouter>
        </ActiveCommunityContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  render(tree);
}

/**
 * The layout redirect only fires on a switch made inside the app. Opening a
 * bookmark, pasting a URL or reloading reaches the page with no transition at
 * all -- the backend authorises the plant on membership, so it answers
 * perfectly well, and the page would render one community's agreements under
 * another community's name.
 */
describe("sharing agreements deep-linked to a plant outside the active community", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the agreements when the plant belongs to the active community", async () => {
    renderPage("community-a");
    await waitFor(() => {
      expect(screen.getByText("Acuerdo vigente")).toBeInTheDocument();
    });
  });

  it("withholds them when the plant belongs to another community", async () => {
    renderPage("community-b");

    await waitFor(() => {
      expect(screen.getByText("Planta no encontrada")).toBeInTheDocument();
    });
    expect(screen.queryByText("Acuerdo vigente")).not.toBeInTheDocument();
  });

  // No community selected is "not resolved yet", not "everything is foreign".
  it("does not claim the plant is missing before a community is resolved", async () => {
    renderPage(null);
    await waitFor(() => {
      expect(screen.getByText("Acuerdo vigente")).toBeInTheDocument();
    });
    expect(screen.queryByText("Planta no encontrada")).not.toBeInTheDocument();
  });
});
