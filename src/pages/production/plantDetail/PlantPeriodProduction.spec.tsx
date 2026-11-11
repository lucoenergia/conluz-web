import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import type { ApexOptions } from "apexcharts";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { query } from "../../../test/queryState";
import { apiError } from "../../../test/apiError";
import { buildPlant, buildPlantCapabilities, buildSupplyReference } from "../../../test/fixtures";
import type {
  GetPlantEnergyMetricsParams,
  PlantDailyEnergyBucketResponse,
  PlantEnergyMetricsResponse,
  PlantMonthlyEnergyBucketResponse,
} from "../../../api/models";

const { Chart } = vi.hoisted(() => ({
  Chart: vi.fn<(props: { series: { name: string; data: (number | null)[] }[]; options: ApexOptions }) => null>(() => null),
}));
// ApexCharts cannot lay out in jsdom: the stub records what each chart is told to draw.
vi.mock("react-apexcharts", () => ({ default: Chart }));

vi.mock(import("../usePlantInActiveCommunity"), async (importOriginal) => ({
  ...(await importOriginal()),
  usePlantInActiveCommunity: vi.fn(),
}));
vi.mock(import("../../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantEnergyMetrics: vi.fn(),
  useGetPlantInverterProductionToday: vi.fn(),
  useGetPlantHourlyEnergySeries: vi.fn(),
  useGetPlantDailyEnergySeries: vi.fn(),
  useGetPlantMonthlyEnergySeries: vi.fn(),
}));
// The old community production reads, mocked only to prove the plant detail never calls them (AC9).
vi.mock(import("../../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetHourlyProduction: vi.fn(),
  useGetDailyProduction: vi.fn(),
  useGetMonthlyProduction: vi.fn(),
  useGetYearlyProduction: vi.fn(),
  useGetHuaweiConfig: vi.fn(),
}));
vi.mock(import("../../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSharingAgreements: vi.fn(),
}));

import { usePlantInActiveCommunity } from "../usePlantInActiveCommunity";
import {
  getPlantDailyEnergySeries,
  getPlantEnergyMetrics,
  getPlantHourlyEnergySeries,
  getPlantMonthlyEnergySeries,
  useGetPlantDailyEnergySeries,
  useGetPlantEnergyMetrics,
  useGetPlantHourlyEnergySeries,
  useGetPlantInverterProductionToday,
  useGetPlantMonthlyEnergySeries,
} from "../../../api/plants/plants";
import {
  useGetDailyProduction,
  useGetHourlyProduction,
  useGetHuaweiConfig,
  useGetMonthlyProduction,
  useGetYearlyProduction,
} from "../../../api/production/production";
import { getSharingAgreements, useGetSharingAgreements } from "../../../api/sharing-agreements/sharing-agreements";
import { ENERGY_COLORS } from "../../../components/EnergyFigures/energyColors";
import { PlantDetailPage } from "../PlantDetailPage";
import { formatKilowattHours } from "../../../utils/formatEnergyFigures";
import {
  LAST_7_DAYS,
  NO_PRODUCTION_DAY,
  NOVEMBER_8_DAY,
  YEAR_2026_MONTHS,
  plantDay,
  plantGapDay,
  plantMetrics,
} from "./plantProduction.testData";

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-1";
const SECTION = "Producción por periodo";
const PUBLICATION =
  "La distribuidora publica la producción con unos días de retraso, así que lo más reciente que puedes ver es el 8 de noviembre de 2026.";
const LAST_7_BOUNDS = { startDate: "2026-11-02T00:00:00+01:00", endDate: "2026-11-09T00:00:00+01:00" };
const YEAR_BOUNDS = { startDate: "2026-01-01T00:00:00+01:00", endDate: "2026-11-09T00:00:00+01:00" };

type Options = { query?: { enabled?: boolean } } | undefined;
const enabled = (options: unknown) => (options as Options)?.query?.enabled !== false;
const isAnchorCall = (params: GetPlantEnergyMetricsParams | undefined) => params?.period !== undefined;

let anchorAnswer: PlantEnergyMetricsResponse | "loading" | "error";
let periodMetrics: (bounds: { startDate: string | null; endDate: string | null }) => PlantEnergyMetricsResponse;
let daily: PlantDailyEnergyBucketResponse[];
let monthly: PlantMonthlyEnergyBucketResponse[];
let plantPending: boolean;
const failedAnchor = query.error(apiError(500));

function serve() {
  vi.mocked(usePlantInActiveCommunity).mockReturnValue({
    plant: plantPending
      ? undefined
      : buildPlant({
          id: PLANT_ID,
          name: "Planta Norte",
          supply: buildSupplyReference({ id: "supply-7", code: "ES0031300806333002ET0F" }),
          community: { id: COMMUNITY_ID },
          capabilities: buildPlantCapabilities({ canRead: true, canManage: true }),
        }),
    isLoading: plantPending,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useGetPlantEnergyMetrics).mockImplementation((_plantId, params, options) => {
    if (!enabled(options)) return query.disabled();
    if (isAnchorCall(params)) {
      if (anchorAnswer === "loading") return query.loading();
      if (anchorAnswer === "error") return failedAnchor;
      return query.success<typeof getPlantEnergyMetrics>(anchorAnswer);
    }
    return query.success<typeof getPlantEnergyMetrics>(
      periodMetrics({ startDate: params?.startDate ?? null, endDate: params?.endDate ?? null }),
    );
  });
  vi.mocked(useGetPlantHourlyEnergySeries).mockImplementation(
    (_p, _b, options) => (enabled(options) ? query.success<typeof getPlantHourlyEnergySeries>([]) : query.disabled()) as ReturnType<typeof useGetPlantHourlyEnergySeries>,
  );
  vi.mocked(useGetPlantDailyEnergySeries).mockImplementation(
    (_p, _b, options) => (enabled(options) ? query.success<typeof getPlantDailyEnergySeries>(daily) : query.disabled()) as ReturnType<typeof useGetPlantDailyEnergySeries>,
  );
  vi.mocked(useGetPlantMonthlyEnergySeries).mockImplementation(
    (_p, _b, options) =>
      (enabled(options) ? query.success<typeof getPlantMonthlyEnergySeries>(monthly) : query.disabled()) as ReturnType<typeof useGetPlantMonthlyEnergySeries>,
  );
  vi.mocked(useGetHuaweiConfig).mockReturnValue(query.loading());
  // Today's inverter block has a spec of its own; here it only has to stay quiet.
  vi.mocked(useGetPlantInverterProductionToday).mockReturnValue(query.loading());
  vi.mocked(useGetSharingAgreements).mockReturnValue(query.success<typeof getSharingAgreements>([]));
}

function renderPage(search = "") {
  serve();
  return renderWithProviders(
    <Routes>
      <Route path="/plants/:plantId" element={<PlantDetailPage />} />
    </Routes>,
    { route: `/plants/${PLANT_ID}${search}`, activeCommunityId: COMMUNITY_ID },
  );
}

const section = () => screen.getByRole("region", { name: SECTION });
const total = () => within(section()).getByRole("group", { name: "Total del periodo" });
/** The requests a hook was enabled for, as [plantId, params]. */
const enabledCalls = <T extends (...args: never[]) => unknown>(hook: T) =>
  vi.mocked(hook).mock.calls.filter((call) => enabled(call[2])).map((call) => [call[0], call[1]]);
const lastChart = () => Chart.mock.calls.at(-1)![0];
type Point = { x: string; marker?: { size?: number }; label?: { text?: string } };
const points = () => (lastChart().options.annotations?.points ?? []) as Point[];

/** jsdom answers no media query, which reads as a phone, where the chart is rows; the chart tests answer as a wide screen. */
function wideScreen() {
  vi.stubGlobal(
    "matchMedia",
    (mediaQuery: string) =>
      ({
        matches: mediaQuery.includes("min-width"),
        media: mediaQuery,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  anchorAnswer = NOVEMBER_8_DAY;
  periodMetrics = (bounds) => plantMetrics(bounds);
  daily = LAST_7_DAYS.map((date) => plantDay(date));
  monthly = YEAR_2026_MONTHS;
  plantPending = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UI-PLT-011 the period, anchored to the plant's latest production day (#406)", () => {
  it("UI-PLT-011 AC5 asks the plant's latest production day for its anchor", () => {
    renderPage();

    const anchorCalls = enabledCalls(useGetPlantEnergyMetrics).filter(([, params]) => isAnchorCall(params as GetPlantEnergyMetricsParams));
    expect(anchorCalls.length).toBeGreaterThan(0);
    expect(new Set(anchorCalls.map(([plantId, params]) => JSON.stringify([plantId, params])))).toEqual(
      new Set([JSON.stringify([PLANT_ID, { period: "LATEST_PRODUCTION_DAY" }])]),
    );
  });

  it("UI-PLT-011 AC5 defaults to Últimos 7 días, from 2 November to 8 November inclusive, labelled by its days", () => {
    renderPage();

    expect(within(section()).getByRole("heading", { name: "Datos del 2 al 8 de noviembre de 2026" })).toBeInTheDocument();
    expect(within(section()).getByRole("button", { name: /Periodo/ })).toHaveTextContent("Últimos 7 días");
    expect(enabledCalls(useGetPlantDailyEnergySeries)).toEqual([[PLANT_ID, LAST_7_BOUNDS]]);
  });

  it("UI-PLT-011 AC5 states the publication sentence for the anchor day, promising no fixed delay", () => {
    renderPage();

    expect(within(section()).getByText(PUBLICATION)).toBeInTheDocument();
  });

  it("UI-PLT-011 AC5 offers Últimos 7 días, Últimos 30 días, Año 2026 and a custom range, in that order", async () => {
    renderPage();

    await userEvent.setup().click(within(section()).getByRole("button", { name: /Periodo/ }));
    const options = within(screen.getByRole("dialog", { name: "Periodo" })).getAllByRole("radio");
    const names = ["Últimos 7 días", "Últimos 30 días", "Año 2026", "Rango personalizado"];
    expect(options).toHaveLength(names.length);
    options.forEach((option, index) => expect(option).toHaveAccessibleName(new RegExp(`^${names[index]}`)));
  });

  it("UI-PLT-011 AC7 Año 2026 is month by month, ends on the anchor day and is labelled by days", () => {
    renderPage("?period=year");

    expect(within(section()).getByRole("heading", { name: "Datos del 1 de enero al 8 de noviembre de 2026" })).toBeInTheDocument();
    expect(enabledCalls(useGetPlantMonthlyEnergySeries)).toEqual([[PLANT_ID, YEAR_BOUNDS]]);
    expect(enabledCalls(useGetPlantDailyEnergySeries)).toEqual([]);
  });

  it("UI-PLT-011 a link naming a period the page does not offer settles to Últimos 7 días", () => {
    renderPage("?period=last12");

    expect(within(section()).getByRole("heading", { name: "Datos del 2 al 8 de noviembre de 2026" })).toBeInTheDocument();
  });
});

describe("UI-PLT-011 the period total (#406)", () => {
  it("UI-PLT-011 reads the total from the metrics of the resolved period, not from the buckets", () => {
    periodMetrics = (bounds) => plantMetrics(bounds, 2_843.25);
    renderPage();

    const periodCalls = enabledCalls(useGetPlantEnergyMetrics).filter(([, params]) => !isAnchorCall(params as GetPlantEnergyMetricsParams));
    expect(new Set(periodCalls.map(([plantId, params]) => JSON.stringify([plantId, params])))).toEqual(
      new Set([JSON.stringify([PLANT_ID, LAST_7_BOUNDS])]),
    );
    expect(total()).toHaveTextContent(formatKilowattHours(2_843.25));
  });

  it("UI-PLT-011 a period with no record at all shows no figure, never a zero", () => {
    periodMetrics = (bounds) => plantMetrics(bounds, null, { hoursWithData: 0, expectedHours: 168 });
    daily = LAST_7_DAYS.map(plantGapDay);
    renderPage();

    expect(within(total()).getByText("Sin datos")).toBeInTheDocument();
    expect(total()).not.toHaveTextContent(/\b0(,0+)? kWh/);
  });

  it("UI-PLT-011 says the total sums only the hours with data when the distributor's coverage is incomplete", () => {
    periodMetrics = (bounds) => plantMetrics(bounds, 2_100, { hoursWithData: 132, expectedHours: 168 });
    renderPage();

    expect(
      within(section()).getByText("Faltan datos de la distribuidora en parte del periodo: el total solo suma las horas con datos."),
    ).toBeInTheDocument();
  });
});

describe("UI-PLT-011 the production chart (#406)", () => {
  beforeEach(wideScreen);

  it("UI-PLT-011 draws one series, the energy exported to the grid, with no savings", () => {
    renderPage();

    expect(new Set(Chart.mock.calls.map(([props]) => props.series.map(({ name }) => name).join()))).toEqual(
      new Set(["Energía vertida a la red"]),
    );
    expect(lastChart().options.xaxis!.categories).toEqual(LAST_7_DAYS);
    expect(section()).not.toHaveTextContent(/Ahorro|ahorro/);
  });

  it("UI-PLT-011 AC6 marks gaps, partial days and measured zeros from their hours, more than one of each", () => {
    daily = [
      plantGapDay("2026/11/02"),
      plantGapDay("2026/11/03"),
      plantDay("2026/11/04", { productionKWh: 205.1, hoursWithData: 12 }),
      plantDay("2026/11/05", { productionKWh: 198.4, hoursWithData: 12 }),
      plantDay("2026/11/06", { productionKWh: 0 }),
      plantDay("2026/11/07", { productionKWh: 0 }),
      plantDay("2026/11/08"),
    ];
    renderPage();

    expect(points().filter((point) => point.marker?.size === 5).map((point) => point.x)).toEqual(["2026/11/02", "2026/11/03"]);
    expect(points().filter((point) => point.label?.text === "*").map((point) => point.x)).toEqual(["2026/11/04", "2026/11/05"]);
    expect(points().filter((point) => point.marker?.size === 4).map((point) => point.x)).toEqual(["2026/11/06", "2026/11/07"]);
    expect(lastChart().series[0].data.slice(0, 2)).toEqual([null, null]);
    expect(within(section()).getByText(/^Faltan datos del 2 al 3 de noviembre de 2026\./)).toBeInTheDocument();
    expect(within(section()).getByText(/solo hay datos de 12 de las 24 horas\./)).toBeInTheDocument();
  });

  it("UI-PLT-011 AC7 under Año 2026 the last month ends on the anchor day, and is marked partial when its hours are", () => {
    renderPage("?period=year");

    expect(lastChart().options.xaxis!.categories).toEqual(YEAR_2026_MONTHS.map(({ date }) => date));
    expect(points().filter((point) => point.label?.text === "*").map((point) => point.x)).toEqual(["2026/11/01"]);
    expect(within(section()).getByText(/solo hay datos de 180 de las 192 horas\./)).toBeInTheDocument();
  });

  it("UI-PLT-011 AC7 a last month whose hours up to the anchor day are all there is not marked partial: its label says where it ends", () => {
    monthly = [...YEAR_2026_MONTHS.slice(0, -1), { ...YEAR_2026_MONTHS.at(-1)!, hoursWithData: 192 }];
    renderPage("?period=year");

    expect(points().filter((point) => point.label?.text === "*")).toEqual([]);
    expect(within(section()).getByRole("heading", { name: "Datos del 1 de enero al 8 de noviembre de 2026" })).toBeInTheDocument();
  });
});

describe("UI-PLT-011 nothing from the distributor yet (#406)", () => {
  it("UI-PLT-011 AC8 shows a neutral notice and no selector, and asks for no period", () => {
    anchorAnswer = NO_PRODUCTION_DAY;
    renderPage();

    const notice = within(section()).getByRole("note");
    expect(notice).toHaveTextContent("Todavía no hay datos de la distribuidora para esta planta");
    expect(within(section()).queryByRole("button", { name: /Periodo/ })).not.toBeInTheDocument();
    expect(enabledCalls(useGetPlantEnergyMetrics).filter(([, params]) => !isAnchorCall(params as GetPlantEnergyMetricsParams))).toEqual([]);
    expect(enabledCalls(useGetPlantDailyEnergySeries)).toEqual([]);
  });

  it("UI-PLT-011 a failed anchor read is an error with a retry, not 'nothing yet'", async () => {
    anchorAnswer = "error";
    renderPage();

    const alert = within(section()).getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo cargar la producción de la planta. Comprueba tu conexión e inténtalo de nuevo.");
    expect(within(section()).queryByText("Todavía no hay datos de la distribuidora para esta planta")).not.toBeInTheDocument();
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(failedAnchor.refetch).toHaveBeenCalled();
  });
});

describe("UI-PLT-011 requests wait for what they need (#406)", () => {
  it("UI-PLT-011 asks nothing before the plant is known", () => {
    plantPending = true;
    renderPage();

    expect(enabledCalls(useGetPlantEnergyMetrics)).toEqual([]);
    expect(enabledCalls(useGetPlantDailyEnergySeries)).toEqual([]);
    expect(enabledCalls(useGetPlantMonthlyEnergySeries)).toEqual([]);
    expect(enabledCalls(useGetPlantHourlyEnergySeries)).toEqual([]);
  });

  it("UI-PLT-011 asks for no period while the anchor is unknown", () => {
    anchorAnswer = "loading";
    renderPage();

    expect(within(section()).getByRole("progressbar", { name: "Cargando la producción de la planta…" })).toBeInTheDocument();
    expect(enabledCalls(useGetPlantEnergyMetrics).filter(([, params]) => !isAnchorCall(params as GetPlantEnergyMetricsParams))).toEqual([]);
    expect(enabledCalls(useGetPlantDailyEnergySeries)).toEqual([]);
  });

  it("UI-PLT-011 AC9 makes no request to the community production operations", () => {
    renderPage();
    renderPage("?period=year");

    for (const hook of [useGetHourlyProduction, useGetDailyProduction, useGetMonthlyProduction, useGetYearlyProduction]) {
      expect(hook).not.toHaveBeenCalled();
    }
  });
});

describe("UI-PLT-013 the period's production is gold, and only as a mark (#406)", () => {
  beforeEach(wideScreen);

  it("UI-PLT-013 AC15 draws the series in ENERGY_COLORS.assigned", () => {
    renderPage();

    expect(lastChart().options.colors).toEqual([ENERGY_COLORS.assigned]);
  });
});
