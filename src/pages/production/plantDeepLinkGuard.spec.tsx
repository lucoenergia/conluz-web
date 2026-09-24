import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { useGetPlantById, type getPlantById } from "../../api/plants/plants";
import {
  useGetSharingAgreementById,
  useGetSharingAgreementPartitionCoefficients,
  useGetSharingAgreements,
  type getSharingAgreementById,
  type getSharingAgreementPartitionCoefficients,
  type getSharingAgreements,
} from "../../api/sharing-agreements/sharing-agreements";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";
import { buildPlant, buildSharingAgreement } from "../../test/fixtures";

const PLANT = buildPlant({
  id: "plant-a",
  providerCode: "PC-1",
  name: "Planta Norte",
  address: "Calle Uno",
  totalPower: 10,
  community: { id: "community-a" },
});

const AGREEMENTS: SharingAgreementResponse[] = [
  buildSharingAgreement({
    id: "agreement-1",
    name: "Acuerdo vigente",
    status: SharingAgreementResponseStatus.PUBLISHED,
  }),
];

vi.mock(import("../../api/plants/plants"), () => ({
  useGetPlantById: vi.fn(),
}));

vi.mock(import("../../api/sharing-agreements/sharing-agreements"), () => ({
  useGetSharingAgreements: vi.fn(),
  useGetSharingAgreementById: vi.fn(),
  useGetSharingAgreementPartitionCoefficients: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => vi.fn(),
}));

vi.mock(import("./useSharingAgreementMutations"), () => ({
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
  vi.mocked(useGetPlantById).mockReturnValue(query.success<typeof getPlantById>(PLANT));
  vi.mocked(useGetSharingAgreements).mockReturnValue(query.success<typeof getSharingAgreements>(AGREEMENTS));
  vi.mocked(useGetSharingAgreementById).mockReturnValue(query.success<typeof getSharingAgreementById>(AGREEMENTS[0]));
  vi.mocked(useGetSharingAgreementPartitionCoefficients).mockReturnValue(
    query.success<typeof getSharingAgreementPartitionCoefficients>([]),
  );
  renderWithProviders(
    <Routes>
      <Route path="/production/:plantId/sharing-agreements" element={<SharingAgreementsPage />} />
    </Routes>,
    { route: "/production/plant-a/sharing-agreements", activeCommunityId },
  );
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
