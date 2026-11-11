import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildCommunityCapabilities, buildSupplyCapabilities } from "../../test/fixtures";
import type { CurrentUserResponse, SupplyResponse } from "../../api/models";

// Neither the evolution charts nor the coefficient history are this file's subject.
// String form: the typed one cannot express this module's default export.
vi.mock("react-apexcharts", () => ({ default: () => null }));
vi.mock(import("../../components/SupplyCoefficientHistorySection"), () => ({
  SupplyCoefficientHistorySection: () => null,
}));
vi.mock(import("./useSupplyInActiveCommunity"), () => ({ useSupplyInActiveCommunity: vi.fn() }));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupplyEnergyMetrics: vi.fn(),
  useGetSupplyDailyConsumption: vi.fn(),
  useGetSupplyMonthlyConsumption: vi.fn(),
}));
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
  useGetMembershipDailyConsumption: vi.fn(),
  useGetMembershipMonthlyConsumption: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import { getSuppliesByUserId, useGetSuppliesByUserId } from "../../api/users/users";
import {
  getSupplyEnergyMetrics,
  useGetSupplyDailyConsumption,
  useGetSupplyEnergyMetrics,
  useGetSupplyMonthlyConsumption,
} from "../../api/supplies/supplies";
import {
  useGetMembershipDailyConsumption,
  useGetMembershipEnergyMetrics,
  useGetMembershipMonthlyConsumption,
} from "../../api/memberships/memberships";
import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import { SupplyDetailPage } from "./SupplyDetailPage";
import { HistoricalAnalysisPage } from "../historical-analysis/HistoricalAnalysisPage";
import { HOME } from "../../components/evolution/consumptionSeries.testData";
import { AUGUST_2026, COMMUNITY_ID, derivedSupplyFigures, member } from "../historical-analysis/historicalAnalysis.testData";

/** The caller's own supply, which opens its figures to them. */
const SUPPLY: SupplyResponse = { ...HOME, capabilities: buildSupplyCapabilities({ canRead: true }) };
/** The one fixture both pages are fed: the supply's latest published month, August 2026. */
const LATEST_MONTH = derivedSupplyFigures(SUPPLY, { period: AUGUST_2026 });

beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = member();
  vi.mocked(useSupplyInActiveCommunity).mockImplementation((supplyId) => ({
    supply: supplyId === SUPPLY.id ? SUPPLY : undefined,
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  }));
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
    options?.query?.enabled === false ? query.disabled() : query.success<typeof getSuppliesByUserId>([SUPPLY]),
  );
  // Every request for the supply's figures, by period or by bounds, gets the same object.
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((_supplyId, _params, options) =>
    options?.query?.enabled === false ? query.disabled() : query.success<typeof getSupplyEnergyMetrics>(LATEST_MONTH),
  );
  vi.mocked(useGetSupplyDailyConsumption).mockReturnValue(query.loading());
  vi.mocked(useGetSupplyMonthlyConsumption).mockReturnValue(query.disabled());
  vi.mocked(useGetMembershipEnergyMetrics).mockReturnValue(query.disabled());
  vi.mocked(useGetMembershipDailyConsumption).mockReturnValue(query.disabled());
  vi.mocked(useGetMembershipMonthlyConsumption).mockReturnValue(query.disabled());
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canRead: true }) })),
  );
});

/** What the period card and the totals say, read from the page on screen. */
function renderedFigures() {
  const card = screen.getByRole("region", { name: "De la energía que te tocó" });
  // Structural: the headline and the consequence sentence are paragraphs with no
  // role of their own, and the card's caption is a heading, so it is left out.
  const sentences = [...card.querySelectorAll("p")].map((paragraph) => paragraph.textContent);
  const totals = within(screen.getByRole("list", { name: "Totales del periodo" }))
    .getAllByRole("listitem")
    .map((tile) => tile.textContent);
  return { sentences, totals };
}

describe("UI-SUP-014 the summary shows what the historical analysis shows for the supply and Último mes publicado (#252)", () => {
  it("UI-SUP-014 AC2 renders the same headline, consequence sentence and four totals as the historical analysis page, from the same response", () => {
    renderWithProviders(
      <Routes>
        <Route path="/supply-points/:supplyPointId" element={<SupplyDetailPage />} />
      </Routes>,
      { route: `/supply-points/${SUPPLY.id}`, activeCommunityId: COMMUNITY_ID },
    );
    const onDetail = renderedFigures();
    cleanup();

    renderWithProviders(<HistoricalAnalysisPage />, {
      route: `/historical-analysis?supplyId=${SUPPLY.id}&period=latest`,
      activeCommunityId: COMMUNITY_ID,
    });
    const onAnalysis = renderedFigures();

    // Not vacuous: the card has a headline and a consequence line, and there are four tiles.
    expect(onDetail.sentences.length).toBeGreaterThanOrEqual(2);
    expect(onDetail.totals).toHaveLength(4);
    expect(onAnalysis.sentences).toEqual(onDetail.sentences);
    expect(onAnalysis.totals).toEqual(onDetail.totals);
  });
});
