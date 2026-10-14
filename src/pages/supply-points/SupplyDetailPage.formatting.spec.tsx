import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
import type { DatadisConsumption, ProductionByTime } from "../../api/models";

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

const hour = (time: string, consumptionKWh: number, surplusEnergyKWh: number, selfConsumptionEnergyKWh: number): DatadisConsumption => ({
  cups: "ES0021000000000000AA",
  date: "2026/08/01",
  time,
  consumptionKWh,
  surplusEnergyKWh,
  selfConsumptionEnergyKWh,
  generationEnergyKWh: selfConsumptionEnergyKWh + surplusEnergyKWh,
});

// Served out of order on purpose: each bar must carry its own point's hour,
// not one derived from its position.
const HOURLY_CONSUMPTION = [
  hour("20:00", 4.111, 1.5, 3),
  hour("09:00", 5.9, 1.5, 3.006),
  hour("13:00", 0, 0, 0),
];

function setup(production: ProductionByTime[] = []) {
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
  vi.mocked(useGetSupplyHourlyProduction).mockReturnValue(query.success<typeof getSupplyHourlyProduction>(production));
  vi.mocked(useGetSupplyDailyProduction).mockReturnValue(query.success<typeof getSupplyHourlyProduction>([]));
  vi.mocked(useGetSupplyMonthlyProduction).mockReturnValue(query.success<typeof getSupplyHourlyProduction>([]));
  vi.mocked(useGetSupplyHourlyConsumption).mockReturnValue(
    query.success<typeof getSupplyHourlyConsumption>(HOURLY_CONSUMPTION),
  );
  vi.mocked(useGetSupplyYearlyConsumption).mockReturnValue(query.success<typeof getSupplyHourlyConsumption>([]));
  for (const hook of [useGetSupplyDailyConsumption, useGetSupplyMonthlyConsumption]) {
    vi.mocked(hook).mockReturnValue(query.success<typeof getSupplyDailyConsumption>([]));
  }

  return renderWithProviders(<SupplyDetailPage />, {
    route: `/supply-points/${SUPPLY_ID}`,
    activeCommunityId: COMMUNITY_ID,
  });
}

type Tooltip = { custom: (args: unknown) => string; y?: { formatter: (value: number) => string } };
type ChartProps = {
  options: { xaxis: { categories: unknown[] }; yaxis: { labels: { formatter: (value: number) => string } }; tooltip: Tooltip };
  series: { name: string; data: number[] }[];
};

function lastChart(match: (props: ChartProps) => boolean): ChartProps {
  const last = chart.mock.calls.map(([props]) => props as ChartProps).filter(match).at(-1);
  if (!last) throw new Error("the chart was never rendered");
  return last;
}
const productionChart = () => lastChart((props) => props.series.length === 1);
const consumptionChart = () => lastChart((props) => props.series.length > 1);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SupplyDetailPage figures", () => {
  // Totals: 4.111 + 5.9 + 0 consumed, 3 + 3.006 + 0 self-consumed, 1.5 + 1.5 surplus.
  it("UI-FMT-001 shows the kWh totals with a decimal comma and at most two decimals", () => {
    setup();

    expect(screen.getByText("10,01 kWh")).toBeInTheDocument();
    expect(screen.getByText("6,01 kWh")).toBeInTheDocument();
    expect(screen.getByText("3 kWh")).toBeInTheDocument();
  });

  // 6.006 / (10.011 + 3) and 6.006 / (3 + 6.006): computed on a 0-100 scale,
  // so a value passed to the formatter undivided would read "4616,09 %".
  it("UI-FMT-001 shows the self-consumption and utilization percentages as their share, to two decimals", () => {
    setup();

    expect(screen.getByText("46,16 %")).toBeInTheDocument();
    expect(screen.getByText("66,69 %")).toBeInTheDocument();
  });

  it("UI-FMT-001 formats the production chart's axis and tooltip kWh through the shared formatter", () => {
    setup([{ time: "2026-08-01T07:00:00Z", power: 12.567 }]);

    const { options } = productionChart();
    expect(options.yaxis.labels.formatter(12.567)).toBe("12,57 kWh");
    expect(options.tooltip.y?.formatter(0.5)).toBe("0,5 kWh");
    expect(
      options.tooltip.custom({ series: [[12.567]], seriesIndex: 0, dataPointIndex: 0, w: { globals: { labels: ["09:00"] } } }),
    ).toContain("12,57 kWh");
  });

  it("UI-FMT-001 formats the consumption chart's axis and tooltip kWh through the shared formatter", () => {
    setup();

    const { options } = consumptionChart();
    expect(options.yaxis.labels.formatter(2.25)).toBe("2,25 kWh");
    const tooltip = options.tooltip.custom({
      series: [[4.111], [3.006], [null]],
      dataPointIndex: 0,
      w: {
        globals: { labels: ["20:00"], collapsedSeriesIndices: [] },
        config: { series: [{ name: "Consumo de Red" }, { name: "Autoconsumo" }, { name: "Excedentes" }], colors: ["", "", ""] },
      },
    });
    expect(tooltip).toContain("4,11 kWh");
    expect(tooltip).toContain("3,01 kWh");
    expect(tooltip).toContain("0 kWh");
  });
});

describe("SupplyDetailPage hourly consumption chart", () => {
  it("UI-FMT-003 labels each bar of the day view with the hour of its own point, in the order served", () => {
    setup();

    expect(consumptionChart().options.xaxis.categories).toEqual(["20:00", "09:00", "13:00"]);
  });
});
