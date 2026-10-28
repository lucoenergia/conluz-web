import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient } from "@tanstack/react-query";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { routeRequests, type RequestConfig } from "../../test/requestRouter";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";

// Tier 2: the subject is the cache's retry behaviour, so the real daily
// consumption hook runs against a mocked customInstance. Production keeps
// React Query's default of three retries (src/queryClient.ts); asking again
// for a period that has not started changes nothing and only delays the empty
// period (#324).

const { mockCustomInstance, mockErrorDispatch } = vi.hoisted(() => ({
  mockCustomInstance: vi.fn(),
  mockErrorDispatch: vi.fn(),
}));
// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from it.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));
vi.mock("react-apexcharts", () => ({ default: () => null }));
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));
vi.mock(import("./useSupplyInActiveCommunity"), () => ({ useSupplyInActiveCommunity: vi.fn() }));
vi.mock(import("../../components/SupplyCoefficientHistorySection"), () => ({
  SupplyCoefficientHistorySection: () => null,
}));
// Every series but the daily consumption one is served without a request.
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupplyHourlyProduction: vi.fn(),
  useGetSupplyDailyProduction: vi.fn(),
  useGetSupplyMonthlyProduction: vi.fn(),
  useGetSupplyHourlyConsumption: vi.fn(),
  useGetSupplyMonthlyConsumption: vi.fn(),
  useGetSupplyYearlyConsumption: vi.fn(),
}));

import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import {
  getSupplyDailyConsumption,
  getSupplyHourlyConsumption,
  getSupplyHourlyProduction,
  useGetSupplyDailyProduction,
  useGetSupplyHourlyConsumption,
  useGetSupplyHourlyProduction,
  useGetSupplyMonthlyConsumption,
  useGetSupplyMonthlyProduction,
  useGetSupplyYearlyConsumption,
} from "../../api/supplies/supplies";
import { SupplyDetailPage } from "./SupplyDetailPage";

const SUPPLY_ID = "supply-1";
const COMMUNITY_ID = "community-a";
const DAILY_URL = `/api/v1/supplies/${SUPPLY_ID}/consumption/daily`;

const startOf = (config: RequestConfig) => (config.params as { startDate: string }).startDate;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSupplyInActiveCommunity).mockReturnValue({
    supply: buildSupply({
      id: SUPPLY_ID,
      community: { id: COMMUNITY_ID, name: "Sol Común" },
      capabilities: buildSupplyCapabilities({}),
    }),
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  });
  for (const hook of [useGetSupplyHourlyProduction, useGetSupplyDailyProduction, useGetSupplyMonthlyProduction]) {
    vi.mocked(hook).mockReturnValue(query.success<typeof getSupplyHourlyProduction>([]));
  }
  for (const hook of [useGetSupplyHourlyConsumption, useGetSupplyYearlyConsumption]) {
    vi.mocked(hook).mockReturnValue(query.success<typeof getSupplyHourlyConsumption>([]));
  }
  vi.mocked(useGetSupplyMonthlyConsumption).mockReturnValue(query.success<typeof getSupplyDailyConsumption>([]));
});

describe("UI-SUP-006 a daily consumption period that has not started yet is asked for once (#324)", () => {
  it("UI-SUP-006 on Mes, the refused current period is requested exactly once, with retries on as in production", async () => {
    // The page asks for the current month and the one before it. Only the
    // later of the two has not started.
    let currentStart: string | undefined;
    const router = routeRequests([
      {
        method: "GET",
        url: DAILY_URL,
        respond: (config) => {
          if (currentStart !== undefined && startOf(config) === currentStart) throw notStarted();
          return [];
        },
      },
    ]);
    const notStarted = () => apiError(400, { code: "ENERGY_METRICS_PERIOD_START_IN_FUTURE", params: null });
    mockCustomInstance.mockImplementation((config: RequestConfig) => {
      const start = startOf(config);
      if (currentStart === undefined || start > currentStart) currentStart = start;
      return router.handle(config);
    });
    // Production's retry count, without its delay, so a retry would show here at once.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });

    const user = userEvent.setup();
    // Under its real path, so the page reads the supply id the hook keys on.
    renderWithProviders(
      <Routes>
        <Route path="/supply-points/:supplyPointId" element={<SupplyDetailPage />} />
      </Routes>,
      {
      route: `/supply-points/${SUPPLY_ID}`,
      activeCommunityId: COMMUNITY_ID,
        queryClient,
      },
    );
    await user.click(screen.getByRole("button", { name: "Mes" }));

    const current = () => router.requests.filter((config) => startOf(config) === currentStart);
    await waitFor(() =>
      expect(queryClient.getQueryCache().findAll({ predicate: (cached) => cached.state.status === "error" })).toHaveLength(1),
    );
    expect(current()).toHaveLength(1);
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });
});
