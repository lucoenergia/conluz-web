import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMemberRecord,
  buildPlant,
  buildPlantCapabilities,
  buildSupply,
  buildSupplyCapabilities,
} from "../../test/fixtures";
import type { SupplyCapabilitiesResponse, SupplyResponse } from "../../api/models";

vi.mock(import("./useSupplyInActiveCommunity"), () => ({ useSupplyInActiveCommunity: vi.fn() }));

// The section under its own gate makes its own request, and is not this file's subject.
vi.mock(import("../../components/SupplyCoefficientHistorySection"), () => ({
  SupplyCoefficientHistorySection: () => null,
}));

vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupplyEnergyMetrics: vi.fn(),
}));
// The plant the tag links to is read for its own canManage (#406).
vi.mock(import("../production/usePlantInActiveCommunity"), () => ({ usePlantInActiveCommunity: vi.fn() }));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import { usePlantInActiveCommunity } from "../production/usePlantInActiveCommunity";
import { getSupplyEnergyMetrics, useGetSupplyEnergyMetrics } from "../../api/supplies/supplies";
import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { SupplyDetailPage } from "./SupplyDetailPage";
import { AUGUST_2026, derivedSupplyFigures } from "../historical-analysis/historicalAnalysis.testData";

const SUPPLY_ID = "supply-1";
const COMMUNITY_ID = "community-a";
const ACTION = "Ver datos de hoy";

function supplyWith(overrides: Partial<SupplyResponse>, capabilities: Partial<SupplyCapabilitiesResponse>) {
  return buildSupply({
    id: SUPPLY_ID,
    name: "Casa de Lucía",
    code: "ES0021000000000000AA",
    community: { id: COMMUNITY_ID, name: "Sol Común" },
    user: { id: "owner-1" },
    ownerRecord: buildMemberRecord({ fullName: "Lucía Martínez Soler" }),
    capabilities: buildSupplyCapabilities(capabilities),
    ...overrides,
  });
}

function render(supply: SupplyResponse) {
  vi.mocked(useSupplyInActiveCommunity).mockReturnValue({ supply, isLoading: false, isNotFound: false, error: null, refetch: vi.fn() });
  vi.mocked(usePlantInActiveCommunity).mockImplementation((plantId) => ({
    plant: plantId === "" ? undefined : buildPlant({ id: plantId, capabilities: buildPlantCapabilities({ canRead: true }) }),
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  }));
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((_id, _params, options) =>
    options?.query?.enabled === false
      ? query.disabled()
      : query.success<typeof getSupplyEnergyMetrics>(derivedSupplyFigures(supply, { period: AUGUST_2026 })),
  );
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canRead: true }) }),
    ),
  );
  return renderWithProviders(<SupplyDetailPage />, { route: `/supply-points/${SUPPLY_ID}`, activeCommunityId: COMMUNITY_ID });
}

const action = () => screen.queryByRole("link", { name: ACTION });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Ver datos de hoy on the supply detail (#432)", () => {
  it("UI-TDY-003 is offered in the header to whoever may read the supply, with the supply preselected", () => {
    render(supplyWith({}, { canRead: true }));

    expect(action()).toHaveAttribute("href", `/today?supplyId=${SUPPLY_ID}`);
    expect(screen.getByTestId("detail-header")).toContainElement(action());
  });

  it("UI-TDY-003 is offered to a community admin on another member's supply, which the supply opens to them", () => {
    render(supplyWith({ user: { id: "another-member" } }, { canRead: true, canEdit: true, canDelete: true }));

    expect(action()).toHaveAttribute("href", `/today?supplyId=${SUPPLY_ID}`);
  });

  it("UI-TDY-003 is not offered for a supply that backs a plant", () => {
    render(supplyWith({ plant: { id: "plant-1", name: "Planta Polideportivo" } }, { canRead: true }));

    expect(screen.getByText("Punto de planta")).toBeInTheDocument();
    expect(action()).not.toBeInTheDocument();
  });

  it("UI-TDY-003 is not offered when the supply withholds canRead", () => {
    render(supplyWith({ user: { id: "another-member" } }, {}));

    expect(screen.getByRole("heading", { level: 1, name: "Casa de Lucía" })).toBeInTheDocument();
    expect(action()).not.toBeInTheDocument();
  });

  it("UI-TDY-003 is not part of the latest published month", () => {
    render(supplyWith({}, { canRead: true }));

    expect(within(screen.getByRole("region", { name: "Último mes publicado" })).queryByRole("link", { name: ACTION })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: ACTION })).toHaveLength(1);
  });
});
