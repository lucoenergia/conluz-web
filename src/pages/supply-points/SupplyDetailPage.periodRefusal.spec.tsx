import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";

// Under EPR-003 in lucoenergia/conluz, a period that has not started yet is
// refused with ENERGY_METRICS_PERIOD_START_IN_FUTURE: "Mes" in the first local
// hour of day 1, "Año" in the first hour of 1 January. For this page that is
// nothing to show yet, not a failure (#324).

const { chart, mockErrorDispatch } = vi.hoisted(() => ({
  chart: vi.fn<(props: unknown) => null>(() => null),
  mockErrorDispatch: vi.fn(),
}));
vi.mock("react-apexcharts", () => ({ default: chart }));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));
vi.mock(import("./useSupplyInActiveCommunity"), () => ({ useSupplyInActiveCommunity: vi.fn() }));
vi.mock(import("../../components/SupplyCoefficientHistorySection"), () => ({
  SupplyCoefficientHistorySection: () => null,
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupplyHourlyProduction: vi.fn(),
  useGetSupplyDailyProduction: vi.fn(),
  useGetSupplyMonthlyProduction: vi.fn(),
  useGetSupplyHourlyConsumption: vi.fn(),
  useGetSupplyDailyConsumption: vi.fn(),
  useGetSupplyMonthlyConsumption: vi.fn(),
  useGetSupplyYearlyConsumption: vi.fn(),
}));

import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import {
  getSupplyDailyConsumption,
  getSupplyHourlyConsumption,
  getSupplyHourlyProduction,
  useGetSupplyDailyConsumption,
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
const LOAD_FAILURE =
  "Ha habido un problema al cargar la información de este punto de suministro. Por favor, inténtalo más tarde";

const NOT_STARTED = () => apiError(400, { code: "ENERGY_METRICS_PERIOD_START_IN_FUTURE", params: null });

/**
 * Every series answers empty, except the current period of the daily and
 * monthly consumption series, which fail with `consumptionError`. The previous
 * period always lies in the past, so it answers.
 */
function setup(consumptionError: Error) {
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
  const failed = query.error(consumptionError);
  const answered = query.success<typeof getSupplyDailyConsumption>([]);
  // The page asks each series twice -- the current period, then the previous
  // one -- so the first call of each render is the current period.
  for (const hook of [useGetSupplyDailyConsumption, useGetSupplyMonthlyConsumption]) {
    let calls = 0;
    vi.mocked(hook).mockImplementation(() => (calls++ % 2 === 0 ? failed : answered) as ReturnType<typeof hook>);
  }

  return renderWithProviders(<SupplyDetailPage />, {
    route: `/supply-points/${SUPPLY_ID}`,
    activeCommunityId: COMMUNITY_ID,
  });
}

type ChartProps = { series: { name: string; data: number[] }[] };
/** The charts as last drawn: production carries one series, consumption three, or none for an empty period. */
const lastCharts = () => chart.mock.calls.map(([props]) => props as ChartProps).slice(-2);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UI-SUP-006 a consumption period that has not started yet is shown as empty (#324)", () => {
  it.each([
    ["Mes", "daily"],
    ["Año", "monthly"],
  ])("UI-SUP-006 on %s, a %s refusal with ENERGY_METRICS_PERIOD_START_IN_FUTURE renders the empty period, with no toast", async (filter) => {
    const user = userEvent.setup();
    setup(NOT_STARTED());

    await user.click(screen.getByRole("button", { name: filter }));

    // Both charts drawn, the consumption one with no series: the empty period, not the loading or failed state.
    expect(lastCharts().map((props) => props.series.length).sort()).toEqual([0, 1]);
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it.each([
    ["another period code", apiError(400, { code: "ENERGY_METRICS_PERIOD_TOO_LONG", params: null })],
    ["a 400 without a code", apiError(400)],
    ["a server error", apiError(500)],
  ])("UI-SUP-006 on Mes, %s is still a load failure", async (_label, error) => {
    const user = userEvent.setup();
    setup(error);

    await user.click(screen.getByRole("button", { name: "Mes" }));

    expect(mockErrorDispatch).toHaveBeenCalledWith(LOAD_FAILURE);
  });
});
