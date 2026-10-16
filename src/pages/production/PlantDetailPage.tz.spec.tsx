import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import { expectDeviceTimeZone } from "../../test/deviceTimeZone";
import type { ProductionByTime } from "../../api/models";

// Runs in the `app-time-zone` Vitest project: the device is in New York, so
// every label below would read differently if it were computed in the
// device's zone instead of Europe/Madrid.

// ApexCharts measures its container in jsdom; the stub records the options
// the page hands it, which is where the labels are.
const { chart } = vi.hoisted(() => ({ chart: vi.fn<(props: unknown) => null>(() => null) }));
vi.mock("react-apexcharts", () => ({ default: chart }));

vi.mock(import("./usePlantInActiveCommunity"), async (importOriginal) => ({
  ...(await importOriginal()),
  usePlantInActiveCommunity: vi.fn(),
}));
vi.mock(import("../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetHourlyProduction: vi.fn(),
  useGetDailyProduction: vi.fn(),
  useGetMonthlyProduction: vi.fn(),
  useGetYearlyProduction: vi.fn(),
}));

import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";
import {
  getHourlyProduction,
  useGetDailyProduction,
  useGetHourlyProduction,
  useGetMonthlyProduction,
  useGetYearlyProduction,
} from "../../api/production/production";
import { PlantDetailPage } from "./PlantDetailPage";

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-1";

const point = (time: string, power: number): ProductionByTime => ({ time, power });

function setup(series: {
  hourly?: ProductionByTime[];
  daily?: ProductionByTime[];
  monthly?: ProductionByTime[];
  yearly?: ProductionByTime[];
}) {
  vi.mocked(usePlantInActiveCommunity).mockReturnValue({
    plant: buildPlant({
      id: PLANT_ID,
      name: "Planta Norte",
      community: { id: COMMUNITY_ID },
      capabilities: buildPlantCapabilities({ canRead: true }),
    }),
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useGetHourlyProduction).mockReturnValue(query.success<typeof getHourlyProduction>(series.hourly ?? []));
  vi.mocked(useGetDailyProduction).mockReturnValue(query.success<typeof getHourlyProduction>(series.daily ?? []));
  vi.mocked(useGetMonthlyProduction).mockReturnValue(query.success<typeof getHourlyProduction>(series.monthly ?? []));
  vi.mocked(useGetYearlyProduction).mockReturnValue(query.success<typeof getHourlyProduction>(series.yearly ?? []));

  return renderWithProviders(
    <Routes>
      <Route path="/production/:plantId" element={<PlantDetailPage />} />
    </Routes>,
    { route: `/production/${PLANT_ID}`, activeCommunityId: COMMUNITY_ID },
  );
}

/** The x-axis labels of the chart as last rendered. */
function chartLabels(): unknown[] {
  const props = chart.mock.lastCall?.[0] as { options: { xaxis: { categories: unknown[] } } };
  return props.options.xaxis.categories;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlantDetailPage chart labels in a device time zone other than the app's", () => {
  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  it("UI-FMT-002 labels each hour of the day view with the Madrid time, past midnight included", () => {
    // 20:00Z is 22:00 in Madrid (16:00 in New York); 22:30Z is 00:30 the next
    // day in Madrid (18:30 the same day in New York).
    setup({ hourly: [point("2026-08-01T20:00:00Z", 1.5), point("2026-08-01T22:30:00Z", 0.4)] });

    expect(chartLabels()).toEqual(["22:00", "00:30"]);
  });

  it("UI-FMT-002 labels each day with its Madrid date when the instant is a different day in New York", async () => {
    const user = userEvent.setup();
    setup({ daily: [point("2026-07-31T22:30:00Z", 12), point("2026-08-01T22:30:00Z", 14)] });

    await user.click(screen.getByRole("button", { name: "Mes" }));

    expect(chartLabels()).toEqual(["01 ago", "02 ago"]);
  });

  it("UI-FMT-002 labels each month with its Madrid month when the instant is the previous month in New York", async () => {
    const user = userEvent.setup();
    setup({ monthly: [point("2026-06-30T22:00:00Z", 300), point("2026-07-31T22:00:00Z", 320)] });

    await user.click(screen.getByRole("button", { name: "Año" }));

    expect(chartLabels()).toEqual(["jul", "ago"]);
  });

  it("UI-FMT-002 labels each year with its Madrid year when the instant is still the old year in New York", async () => {
    const user = userEvent.setup();
    setup({ yearly: [point("2024-12-31T23:00:00Z", 3000), point("2025-12-31T23:30:00Z", 3100)] });

    await user.click(screen.getByRole("button", { name: "Total" }));

    expect(chartLabels()).toEqual(["2025", "2026"]);
  });
});
