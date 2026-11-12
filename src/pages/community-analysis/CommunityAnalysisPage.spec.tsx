import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navigate, useLocation } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import type { CommunityEnergyMetricsResponse, CurrentUserResponse } from "../../api/models";

const { Chart } = vi.hoisted(() => ({ Chart: vi.fn(() => null) }));
// ApexCharts cannot lay out in jsdom; CommunityAnalysisPage.evolution.spec.tsx covers the chart.
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
  getCommunityDailyEnergySeries,
  getCommunityEnergyMetrics,
  getCommunityMonthlyEnergySeries,
  useGetAllCommunities,
  useGetCommunityDailyEnergySeries,
  useGetCommunityEnergyMetrics,
  useGetCommunityHourlyEnergySeries,
  useGetCommunityMonthlyEnergySeries,
} from "../../api/communities/communities";
import { getSuppliesByUserId, useGetSuppliesByUserId } from "../../api/users/users";
import { useActiveCommunity } from "../../context/community.context";
import { useCommunitySwitchRedirect } from "../../hooks/useCommunitySwitchRedirect";
import { formatKilowattHours } from "../../utils/formatEnergyFigures";
import { CommunityAnalysisPage } from "./CommunityAnalysisPage";
import { wholePercent } from "./communityFigureTexts";
import {
  COMMUNITY,
  COMMUNITY_ID,
  JULY_2026,
  NOTHING_PUBLISHED,
  OTHER_COMMUNITY,
  OTHER_COMMUNITY_ID,
  SEPTEMBER_2026,
  SEPTEMBER_DAYS,
  communityDay,
  communityMetrics,
  communityMonth,
  member,
  plain,
} from "./communityAnalysis.testData";

const PERIOD = /^Periodo/;
const PUBLICATION_SEPTEMBER =
  "Los datos de cada mes se publican hacia el día 10 del mes siguiente, así que lo más reciente que puedes ver es septiembre de 2026.";
const NO_DATA_TITLE = "Todavía no hay datos publicados";
const ANCHOR_ERROR = "No se pudo cargar la energía de la comunidad. Comprueba tu conexión e inténtalo de nuevo.";
const METRICS_ERROR = "No se pudieron cargar las cifras de la comunidad. Comprueba tu conexión e inténtalo de nuevo.";
const CLAMPED_TO_JULY = "La comunidad tiene datos publicados hasta julio de 2026, así que hemos ajustado el periodo.";
const COVERAGE_12_OF_14 = "12 de 14 puntos de suministro tienen datos de este periodo. Las cifras pueden subir cuando lleguen los que faltan.";

type Period = { startDate: string | null; endDate: string | null };
type Options = { query?: { enabled?: boolean } } | undefined;

/** Each community's latest published month. */
let anchors: Record<string, Period>;
/** What the period's metrics hold, beyond the plain case. */
let periodOverrides: Partial<CommunityEnergyMetricsResponse>;
let anchorAnswer: "ready" | "loading" | "error";
let metricsAnswer: "ready" | "error";
const failedAnchor = query.error(apiError(500));
const failedMetrics = query.error(apiError(500));

const isAnchorCall = (params: unknown) => typeof params === "object" && params !== null && "period" in params;

function serve() {
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.success<typeof getSuppliesByUserId>([]));
  vi.mocked(useGetAllCommunities).mockReturnValue(query.success<typeof getAllCommunities>([COMMUNITY, OTHER_COMMUNITY]));
  vi.mocked(useGetCommunityEnergyMetrics).mockImplementation((communityId, params, options) => {
    if ((options as Options)?.query?.enabled === false) return query.disabled();
    if (isAnchorCall(params)) {
      if (anchorAnswer === "loading") return query.loading();
      if (anchorAnswer === "error") return failedAnchor;
      return query.success<typeof getCommunityEnergyMetrics>(communityMetrics(anchors[communityId], periodOverrides));
    }
    if (metricsAnswer === "error") return failedMetrics;
    const { startDate = null, endDate = null } = params ?? {};
    return query.success<typeof getCommunityEnergyMetrics>(communityMetrics({ startDate, endDate }, periodOverrides));
  });
  vi.mocked(useGetCommunityHourlyEnergySeries).mockReturnValue(query.disabled());
  vi.mocked(useGetCommunityDailyEnergySeries).mockImplementation((_c, _p, options) =>
    options?.query?.enabled === false
      ? query.disabled()
      : query.success<typeof getCommunityDailyEnergySeries>(SEPTEMBER_DAYS.map((date) => communityDay(date))),
  );
  vi.mocked(useGetCommunityMonthlyEnergySeries).mockImplementation((_c, _p, options) =>
    options?.query?.enabled === false ? query.disabled() : query.success<typeof getCommunityMonthlyEnergySeries>([communityMonth("2026/09/01")]),
  );
}

/** The metrics requests that ran, as [communityId, params]. */
const metricsCalls = () =>
  vi
    .mocked(useGetCommunityEnergyMetrics)
    .mock.calls.filter((call) => (call[2] as Options)?.query?.enabled !== false)
    .map(([communityId, params]) => [communityId, params]);
/** The distinct period requests, by explicit bounds: a hook is called again on every render. */
const periodMetricsCalls = () => [
  ...new Map(metricsCalls().filter(([, params]) => !isAnchorCall(params)).map((call) => [JSON.stringify(call), call])).values(),
];

function CurrentLocation() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}
const currentSearch = () => new URLSearchParams(screen.getByTestId("location").textContent!.split("?")[1] ?? "");

/** As AuthenticatedLayout renders a routed page: the switch redirect first, then the page keyed on the community. */
function AsRouted() {
  const communityId = useActiveCommunity();
  const redirect = useCommunitySwitchRedirect();
  return (
    <>
      {redirect ? <Navigate to={redirect} replace /> : <CommunityAnalysisPage key={communityId} />}
      <CurrentLocation />
    </>
  );
}

function renderPage(search = "", activeCommunityId: string | null = COMMUNITY_ID) {
  return renderWithProviders(<AsRouted />, { route: `/community-analysis${search}`, activeCommunityId });
}

const heading = () => screen.getByRole("heading", { level: 2, name: /^Datos/ });

beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = member();
  anchors = { [COMMUNITY_ID]: SEPTEMBER_2026, [OTHER_COMMUNITY_ID]: JULY_2026 };
  periodOverrides = {};
  anchorAnswer = "ready";
  metricsAnswer = "ready";
  serve();
});

describe("UI-CAN-001 the page (#403)", () => {
  it("UI-CAN-001 renders at /community-analysis, with the community, its plants and their peak and nominal power", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Energía de la comunidad" })).toBeInTheDocument();
    expect(screen.getByText("Luco Energía · 3 plantas · Potencia pico 112,5 kWp · Potencia nominal 90 kW")).toBeInTheDocument();
  });
});

describe("UI-CAN-002 the period is anchored to the community's latest published month (#403)", () => {
  it("UI-CAN-002 asks the active community's latest published month", () => {
    renderPage();

    expect(metricsCalls().filter(([, params]) => isAnchorCall(params))).toContainEqual([COMMUNITY_ID, { period: "LATEST_PUBLISHED_MONTH" }]);
  });

  it("UI-CAN-002 defaults to the latest published month, named by the publication sentence (AC3)", () => {
    renderPage();

    expect(heading()).toHaveTextContent("Datos de septiembre de 2026");
    expect(screen.getByText(PUBLICATION_SEPTEMBER)).toBeInTheDocument();
    expect(periodMetricsCalls()).toEqual([[COMMUNITY_ID, { startDate: SEPTEMBER_2026.startDate, endDate: SEPTEMBER_2026.endDate }]]);
  });

  it("UI-CAN-002 offers the presets of 'Mi consumo y ahorro' and a custom range (AC3)", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: PERIOD }));
    const sheet = screen.getByRole("dialog", { name: "Periodo" });

    for (const name of [/^Último mes publicado/, /^Año 2026/, /^Últimos 12 meses/, /^Rango personalizado/]) {
      expect(within(sheet).getByRole("radio", { name })).toBeInTheDocument();
    }
    expect(within(sheet).getAllByRole("radio")).toHaveLength(4);
  });

  it("UI-CAN-002 keeps the period in the query string, and asks the metrics for it", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: PERIOD }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "Periodo" })).getByRole("radio", { name: /^Últimos 12 meses/ }));

    expect(currentSearch().get("period")).toBe("last12");
    expect(heading()).toHaveTextContent("Datos de octubre de 2025 a septiembre de 2026");
    expect(periodMetricsCalls()).toContainEqual([COMMUNITY_ID, { startDate: "2025-10-01T00:00:00+02:00", endDate: "2026-10-01T00:00:00+02:00" }]);
  });

  it("UI-CAN-002 a community switch keeps the period and clamps it to the new community's anchor, and says so (AC2)", async () => {
    const { switchActiveCommunity } = renderPage("?period=custom&from=2026-07-10&to=2026-09-20");
    expect(heading()).toHaveTextContent("Datos de julio a septiembre de 2026");

    switchActiveCommunity(OTHER_COMMUNITY_ID);

    await waitFor(() => expect(currentSearch().get("to")).toBe("2026-07-31"));
    expect(currentSearch().get("from")).toBe("2026-07-10");
    expect(screen.getAllByText(CLAMPED_TO_JULY).length).toBeGreaterThan(0);
    expect(heading()).toHaveTextContent("Datos del 10 al 31 de julio de 2026");
    expect(periodMetricsCalls()).toContainEqual([OTHER_COMMUNITY_ID, { startDate: "2026-07-10T00:00:00+02:00", endDate: "2026-08-01T00:00:00+02:00" }]);
  });

  it("UI-CAN-002 with nothing published shows a neutral notice and no selector, and asks no period (AC4)", () => {
    anchors[COMMUNITY_ID] = NOTHING_PUBLISHED;
    renderPage();

    expect(screen.getByRole("note")).toHaveTextContent(NO_DATA_TITLE);
    expect(screen.queryByRole("button", { name: PERIOD })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(periodMetricsCalls()).toEqual([]);
  });

  it("UI-CAN-002 a failed anchor is an error with a retry, not 'nothing published'", async () => {
    anchorAnswer = "error";
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(ANCHOR_ERROR);
    expect(screen.queryByText(NO_DATA_TITLE)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(failedAnchor.refetch).toHaveBeenCalled();
  });

  it("UI-CAN-002 while the anchor loads, a placeholder shows and neither figures nor series are asked", () => {
    anchorAnswer = "loading";
    renderPage();

    expect(screen.getByRole("progressbar", { name: "Cargando la energía de la comunidad…" })).toBeInTheDocument();
    expect(periodMetricsCalls()).toEqual([]);
    for (const hook of [useGetCommunityHourlyEnergySeries, useGetCommunityDailyEnergySeries, useGetCommunityMonthlyEnergySeries]) {
      expect(vi.mocked(hook).mock.calls.filter((call) => (call[2] as Options)?.query?.enabled !== false)).toEqual([]);
    }
  });

  it("UI-CAN-002 asks nothing before the community is known", () => {
    renderPage("", null);

    expect(metricsCalls()).toEqual([]);
  });
});

describe("UI-CAN-003 the figures come from the period's metrics (#403)", () => {
  it("UI-CAN-003 shows the server's ratios, where a recomputation would differ (AC5)", () => {
    // 1.000 and 3.000 kWh would be 25 % and 75 %.
    periodOverrides = {
      energy: { productionKWh: 4120.75, selfConsumptionKWh: 1000, surplusKWh: 3000 },
      selfConsumptionRatio: 0.585,
      surplusRatio: 0.415,
    };
    renderPage();

    const journey = screen.getByRole("region", { name: "El recorrido de la energía de la comunidad" });
    expect(journey).toHaveTextContent(plain(formatKilowattHours(4120.75)));
    const [used, exported] = within(within(journey).getByRole("list", { name: "Adónde fue la energía" })).getAllByRole("listitem");
    expect(used).toHaveTextContent(plain(`${formatKilowattHours(1000)}${wholePercent(0.585)}`));
    expect(exported).toHaveTextContent(plain(`${formatKilowattHours(3000)}${wholePercent(0.415)}`));
    expect(journey).not.toHaveTextContent(plain(wholePercent(0.25)));
    expect(journey).not.toHaveTextContent(plain(wholePercent(0.75)));
  });

  it("UI-CAN-003 a failed metrics read is an error with a retry", async () => {
    metricsAnswer = "error";
    renderPage();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(METRICS_ERROR);
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(failedMetrics.refetch).toHaveBeenCalled();
  });

  it("UI-CAN-003 shows no member name, supply code or per-supply figure (AC15)", () => {
    renderPage();

    const page = document.body.textContent ?? "";
    expect(page).not.toContain("Ana Pérez Lago");
    expect(page).not.toContain(COMMUNITY.adminNames[0]);
    expect(page).not.toMatch(/ES\d{16}/);
    expect(screen.queryByRole("button", { name: /punto de suministro|Todos mis puntos/i })).not.toBeInTheDocument();
  });
});

describe("UI-CAN-004 the coverage notice (#403)", () => {
  it("UI-CAN-004 says how many supplies have data when some are missing (AC6)", () => {
    periodOverrides = { coverage: { supplyCount: 14, suppliesWithData: 12 } };
    renderPage();

    expect(screen.getByText(COVERAGE_12_OF_14)).toBeInTheDocument();
    expect(screen.getByText(COVERAGE_12_OF_14).closest('[role="note"]')).not.toBeNull();
  });

  it("UI-CAN-004 says nothing when every supply has data (AC6)", () => {
    periodOverrides = { coverage: { supplyCount: 14, suppliesWithData: 14 } };
    renderPage();

    expect(screen.queryByText(/puntos de suministro tienen datos de este periodo/)).not.toBeInTheDocument();
  });
});

describe("UI-CAN-008 a community without plants (#403)", () => {
  it("UI-CAN-008 says so in the header and in a neutral plants section (AC13)", () => {
    periodOverrides = { plants: [], peakPowerKWp: 0, nominalPowerKW: 0 };
    renderPage();

    expect(screen.getByText("Luco Energía · sin plantas todavía")).toBeInTheDocument();
    const plants = screen.getByRole("region", { name: "Plantas" });
    expect(within(plants).getByRole("note")).toHaveTextContent("Esta comunidad todavía no tiene plantas");
  });
});
