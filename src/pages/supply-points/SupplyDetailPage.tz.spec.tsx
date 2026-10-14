import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
import { expectDeviceTimeZone } from "../../test/deviceTimeZone";
import type { ProductionByTime } from "../../api/models";

// Runs in the `app-time-zone` Vitest project: the device is in New York, so
// every label below would read differently if it were computed in the
// device's zone instead of Europe/Madrid.

// ApexCharts measures its container in jsdom; the stub records the options
// and series each chart is handed.
const { chart } = vi.hoisted(() => ({ chart: vi.fn<(props: unknown) => null>(() => null) }));
vi.mock("react-apexcharts", () => ({ default: chart }));

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

const point = (time: string, power: number): ProductionByTime => ({ time, power });

function setup(production: { hourly?: ProductionByTime[]; monthly?: ProductionByTime[] }) {
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
  vi.mocked(useGetSupplyHourlyProduction).mockReturnValue(
    query.success<typeof getSupplyHourlyProduction>(production.hourly ?? []),
  );
  vi.mocked(useGetSupplyDailyProduction).mockReturnValue(query.success<typeof getSupplyHourlyProduction>([]));
  vi.mocked(useGetSupplyMonthlyProduction).mockReturnValue(
    query.success<typeof getSupplyHourlyProduction>(production.monthly ?? []),
  );
  for (const hook of [useGetSupplyHourlyConsumption, useGetSupplyYearlyConsumption]) {
    vi.mocked(hook).mockReturnValue(query.success<typeof getSupplyHourlyConsumption>([]));
  }
  for (const hook of [useGetSupplyDailyConsumption, useGetSupplyMonthlyConsumption]) {
    vi.mocked(hook).mockReturnValue(query.success<typeof getSupplyDailyConsumption>([]));
  }

  return renderWithProviders(<SupplyDetailPage />, {
    route: `/supply-points/${SUPPLY_ID}`,
    activeCommunityId: COMMUNITY_ID,
  });
}

type ChartProps = { options: { xaxis: { categories: unknown[] } }; series: { name: string; data: number[] }[] };

/** The production chart as last rendered: the single-series one. */
function productionChart(): ChartProps {
  const calls = chart.mock.calls.map(([props]) => props as ChartProps);
  const last = calls.filter((props) => props.series.length === 1).at(-1);
  if (!last) throw new Error("the production chart was never rendered");
  return last;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SupplyDetailPage production chart in a device time zone other than the app's", () => {
  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  it("UI-FMT-002 labels each hour of the day view with the Madrid time, past midnight included", () => {
    // 20:00Z is 22:00 in Madrid (16:00 in New York); 22:30Z is 00:30 the next
    // day in Madrid (18:30 the same day in New York).
    setup({ hourly: [point("2026-08-01T20:00:00Z", 1.5), point("2026-08-01T22:30:00Z", 0.4)] });

    expect(productionChart().options.xaxis.categories).toEqual(["22:00", "00:30"]);
  });

  // The totals view adds the monthly series up by year, so the year decides
  // which bucket a month's production lands in, not only how it is labelled.
  it("UI-FMT-002 puts an instant that is New Year in Madrid but New Year's Eve in New York in the new year's bucket", async () => {
    const user = userEvent.setup();
    setup({
      monthly: [
        point("2025-06-30T22:00:00Z", 100), // July 2025 everywhere
        point("2025-12-31T23:30:00Z", 40), // 1 Jan 2026 in Madrid, 31 Dec 2025 in New York
        point("2026-01-31T23:00:00Z", 60), // February 2026 everywhere
      ],
    });

    await user.click(screen.getByRole("button", { name: "Totales" }));

    const { options, series } = productionChart();
    expect(options.xaxis.categories).toEqual(["2025", "2026"]);
    expect(series[0].data).toEqual([100, 100]);
  });
});
