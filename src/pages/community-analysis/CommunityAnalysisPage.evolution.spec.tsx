import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApexOptions } from "apexcharts";
import { renderWithProviders } from "../../test/renderWithProviders";
import { declaredStyle } from "../../test/declaredStyle";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import type { CommunityDailyEnergyBucketResponse, CurrentUserResponse } from "../../api/models";

const { Chart } = vi.hoisted(() => ({
  Chart: vi.fn<(props: { series: { name: string; group: string; data: (number | null)[] }[]; options: ApexOptions }) => null>(() => null),
}));
// ApexCharts cannot lay out in jsdom: the stub records what each chart is told to draw.
vi.mock("react-apexcharts", () => ({ default: Chart }));

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
  useGetCommunityEnergyMetrics: vi.fn(),
  useGetCommunityHourlyEnergySeries: vi.fn(),
  useGetCommunityDailyEnergySeries: vi.fn(),
  useGetCommunityMonthlyEnergySeries: vi.fn(),
}));
// The member belongs to two communities, so the community provider's entry rule reads their supplies.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import {
  getAllCommunities,
  getCommunityEnergyMetrics,
  useGetAllCommunities,
  useGetCommunityDailyEnergySeries,
  useGetCommunityEnergyMetrics,
  useGetCommunityHourlyEnergySeries,
  useGetCommunityMonthlyEnergySeries,
} from "../../api/communities/communities";
import { getSuppliesByUserId, useGetSuppliesByUserId } from "../../api/users/users";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import { colors } from "../../theme/tokens";
import { formatKilowattHourAmount, formatKilowattHours } from "../../utils/formatEnergyFigures";
import { CommunityAnalysisPage } from "./CommunityAnalysisPage";
import {
  COMMUNITY,
  COMMUNITY_ID,
  OTHER_COMMUNITY,
  SEPTEMBER_2026,
  SEPTEMBER_DAYS,
  communityDay,
  communityGapDay,
  communityMetrics,
  communityMonth,
  member,
} from "./communityAnalysis.testData";

const DAILY_TITLE = "La energía de la comunidad día a día";
const MONTHLY_TITLE = "La energía de la comunidad mes a mes";
const LEGEND = "Energía de los puntos de la comunidad";
const GOLD = colors.marks.gold;

type Options = { query?: { enabled?: boolean } } | undefined;
const isAnchorCall = (params: unknown) => typeof params === "object" && params !== null && "period" in params;

let daily: CommunityDailyEnergyBucketResponse[];
let seriesAnswer: "ready" | "loading" | "error";
const failed = query.error(apiError(500));

function answer<T>(options: unknown, data: () => T) {
  if ((options as Options)?.query?.enabled === false) return query.disabled();
  if (seriesAnswer === "loading") return query.loading();
  if (seriesAnswer === "error") return failed;
  return query.success(data() as never);
}

function serve() {
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.success<typeof getSuppliesByUserId>([]));
  vi.mocked(useGetAllCommunities).mockReturnValue(query.success<typeof getAllCommunities>([COMMUNITY, OTHER_COMMUNITY]));
  vi.mocked(useGetCommunityEnergyMetrics).mockImplementation((_communityId, params, options) => {
    if ((options as Options)?.query?.enabled === false) return query.disabled();
    if (isAnchorCall(params)) return query.success<typeof getCommunityEnergyMetrics>(communityMetrics(SEPTEMBER_2026));
    const { startDate = null, endDate = null } = params ?? {};
    return query.success<typeof getCommunityEnergyMetrics>(communityMetrics({ startDate, endDate }));
  });
  vi.mocked(useGetCommunityHourlyEnergySeries).mockImplementation(
    (_c, _p, options) => answer(options, () => []) as ReturnType<typeof useGetCommunityHourlyEnergySeries>,
  );
  vi.mocked(useGetCommunityDailyEnergySeries).mockImplementation(
    (_c, _p, options) => answer(options, () => daily) as ReturnType<typeof useGetCommunityDailyEnergySeries>,
  );
  vi.mocked(useGetCommunityMonthlyEnergySeries).mockImplementation(
    (_c, _p, options) =>
      answer(options, () => [communityMonth("2025/10/01"), communityMonth("2026/09/01")]) as ReturnType<typeof useGetCommunityMonthlyEnergySeries>,
  );
}

function renderPage(search = "") {
  return renderWithProviders(<CommunityAnalysisPage />, { route: `/community-analysis${search}`, activeCommunityId: COMMUNITY_ID });
}

/** The last time each chart was drawn. */
const chartCalls = () => Chart.mock.calls.map(([props]) => props);
const lastChart = () => chartCalls().at(-1)!;
const card = (title = DAILY_TITLE) => screen.getByRole("region", { name: title });
/** A legend entry's swatch: the one decorative box in it, which has no role or name to find it by. */
const swatchColour = (entry: Element) => declaredStyle(entry.querySelector("[aria-hidden]")!)["background-color"];

/**
 * jsdom answers no media query, which reads as a phone, where the chart is
 * rows. The chart tests answer every (min-width) query as a wide screen.
 */
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

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = member();
  daily = SEPTEMBER_DAYS.map((date) => communityDay(date));
  seriesAnswer = "ready";
  serve();
});

describe("UI-CAN-007 the evolution chart (#403)", () => {
  beforeEach(wideScreen);

  it("UI-CAN-007 stacks 'se usó en la comunidad' and 'se fue a la red' in one bar, day by day", () => {
    renderPage();

    expect(card()).toBeInTheDocument();
    expect(lastChart().series.map(({ name, group }) => [name, group])).toEqual([
      ["Se usó en la comunidad", "community"],
      ["Se fue a la red", "community"],
    ]);
    expect(lastChart().options.xaxis!.categories).toEqual(SEPTEMBER_DAYS);
  });

  it("UI-CAN-007 follows the period's granularity: twelve months ask the monthly series", async () => {
    renderPage("?period=last12");

    expect(card(MONTHLY_TITLE)).toBeInTheDocument();
    const asked = (hook: typeof useGetCommunityMonthlyEnergySeries | typeof useGetCommunityDailyEnergySeries) =>
      vi.mocked(hook).mock.calls.filter((call) => (call[2] as Options)?.query?.enabled !== false);
    expect(asked(useGetCommunityMonthlyEnergySeries).length).toBeGreaterThan(0);
    expect(asked(useGetCommunityDailyEnergySeries)).toEqual([]);
  });

  it("UI-CAN-007 marks gaps, partial days and measured zeros, more than one of each, in words and marks (AC10)", () => {
    daily = SEPTEMBER_DAYS.map((date) => {
      if (date === "2026/09/03" || date === "2026/09/04") return communityGapDay(date);
      if (date === "2026/09/10" || date === "2026/09/11") return communityDay(date, { suppliesWithData: 2, supplyCount: 3 });
      if (date === "2026/09/20" || date === "2026/09/21") return communityDay(date, { selfConsumptionKWh: 0, surplusKWh: 0 });
      return communityDay(date);
    });
    renderPage();

    expect(within(card()).getByText("Faltan datos del 3 al 4 de septiembre de 2026. Los totales suman solo los días con datos.")).toBeInTheDocument();
    expect(
      within(card()).getByText(
        "En los días del 10 al 11 de septiembre de 2026 solo hay datos de 2 de los 3 puntos de suministro de la comunidad. Esos días se marcan como parciales.",
      ),
    ).toBeInTheDocument();
    expect(within(card()).getByText(/: 28 de 30 días con datos; faltan 2\.$/)).toBeInTheDocument();
    const points = (lastChart().options.annotations?.points ?? []) as { x: string; marker?: { size?: number }; label?: { text?: string } }[];
    expect(points.filter((point) => point.marker?.size === 5).map((point) => point.x)).toEqual(["2026/09/03", "2026/09/04"]);
    expect(points.filter((point) => point.label?.text === "*").map((point) => point.x)).toEqual(["2026/09/10", "2026/09/11"]);
    expect(points.filter((point) => point.marker?.size === 4).map((point) => point.x)).toEqual(["2026/09/20", "2026/09/21"]);
    expect(lastChart().series.every((series) => series.data[2] === null && series.data[3] === null)).toBe(true);
  });

  it("UI-CAN-007 has no savings chart, legend or price (AC11)", () => {
    renderPage();

    expect(new Set(chartCalls().map((props) => props.series[0].name))).toEqual(new Set(["Se usó en la comunidad"]));
    expect(card()).not.toHaveTextContent(/Ahorro|ahorro/);
    expect(card()).not.toHaveTextContent("Estimado con un precio");
  });

  it("UI-CAN-007 a placeholder stands in the chart's place while the series loads", () => {
    seriesAnswer = "loading";
    renderPage();

    expect(screen.getByRole("progressbar", { name: "Cargando la evolución de la energía de la comunidad…" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: DAILY_TITLE })).not.toBeInTheDocument();
  });

  it("UI-CAN-007 a failed series is an error with a retry, and no chart", async () => {
    seriesAnswer = "error";
    renderPage();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo cargar la evolución de la energía de la comunidad. Comprueba tu conexión e inténtalo de nuevo.");
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalled();
  });
});

describe("UI-CAN-009 the page's colours (AC14)", () => {
  beforeEach(wideScreen);

  it("UI-CAN-009 draws the chart in community and exported only: no gold, and no other energy colour", () => {
    renderPage();

    expect(lastChart().options.colors).toEqual([ENERGY_COLORS.community, ENERGY_COLORS.exported]);
  });

  it("UI-CAN-009 keys the chart's legend to community and exported, with no gold in it", () => {
    renderPage();

    const legend = within(card()).getByRole("group", { name: LEGEND });
    const swatches = within(legend).getAllByRole("listitem").map(swatchColour);
    expect(swatches).toEqual([ENERGY_COLORS.community, ENERGY_COLORS.exported]);
    expect(swatches).not.toContain(GOLD);
  });

  it("UI-CAN-009 keys the journey's split legend to community and exported, with no gold in it", () => {
    renderPage();

    const split = screen.getByRole("list", { name: "Adónde fue la energía" });
    const swatches = within(split).getAllByRole("listitem").map(swatchColour);
    expect(swatches).toEqual([ENERGY_COLORS.community, ENERGY_COLORS.exported]);
    expect(swatches).not.toContain(GOLD);
  });

  it("UI-CAN-009 marks production in ENERGY_COLORS.assigned: the journey's swatch and the plants' share bars", () => {
    renderPage();

    const production = screen.getByText("Las plantas produjeron").parentElement!;
    expect(swatchColour(production)).toBe(ENERGY_COLORS.assigned);
    const plants = within(screen.getByRole("list", { name: "Plantas de la comunidad" })).getAllByRole("listitem");
    expect(plants.length).toBeGreaterThan(1);
    for (const plant of plants) {
      const bar = plant.querySelector("[aria-hidden]")!.firstElementChild!;
      expect(declaredStyle(bar)["background-color"]).toBe(ENERGY_COLORS.assigned);
    }
  });

  it("UI-CAN-009 draws no text in marks.gold anywhere on the page", () => {
    renderPage();

    const golden = [...document.body.querySelectorAll("*")].filter((element) => declaredStyle(element).color === GOLD);
    expect(golden).toEqual([]);
  });
});

describe("UI-CAN-003 the mobile rows' total (accepted exception, UI-HIS-025)", () => {
  it("UI-CAN-003 a row's figure is the sum of its two rendered segment values", async () => {
    daily = SEPTEMBER_DAYS.map((date) => (date === "2026/09/01" ? communityDay(date, { selfConsumptionKWh: 10.25, surplusKWh: 3.45 }) : communityDay(date)));
    renderPage();

    const rows = screen.getByRole("list", { name: "Energía de la comunidad por día" });
    const row = within(rows).getByRole("button", { name: `1 de septiembre de 2026: ${formatKilowattHours(10.25 + 3.45)}` });
    expect(row).toHaveTextContent(formatKilowattHourAmount(13.7));
    await userEvent.click(row);
    // The detail opens beneath its row, inside the same list item, with no name of its own.
    const detail = row.closest("li")!;
    expect(detail).toHaveTextContent(formatKilowattHours(10.25));
    expect(detail).toHaveTextContent(formatKilowattHours(3.45));
    // The figures' column is headed "Total", above the rows.
    expect(screen.getByText("Total")).toBeInTheDocument();
  });
});
