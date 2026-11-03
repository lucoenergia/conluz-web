import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { formatEuros } from "../../utils/formatEnergyFigures";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import type {
  CurrentUserResponse,
  MembershipDailyConsumptionBucketResponse,
  MembershipEnergyMetricsResponse,
  SupplyResponse,
} from "../../api/models";

// ApexCharts cannot lay out in jsdom, and the evolution charts are not this spec's subject.
vi.mock("react-apexcharts", () => ({ default: () => null }));

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

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import { getSuppliesByUserId, useGetSuppliesByUserId } from "../../api/users/users";
import {
  getSupplyDailyConsumption,
  getSupplyEnergyMetrics,
  useGetSupplyDailyConsumption,
  useGetSupplyEnergyMetrics,
  useGetSupplyMonthlyConsumption,
} from "../../api/supplies/supplies";
import {
  getMembershipDailyConsumption,
  getMembershipEnergyMetrics,
  getMembershipMonthlyConsumption,
  useGetMembershipDailyConsumption,
  useGetMembershipEnergyMetrics,
  useGetMembershipMonthlyConsumption,
} from "../../api/memberships/memberships";
import { HistoricalAnalysisPage } from "./HistoricalAnalysisPage";
import { toConsumptionSeriesView } from "./consumptionSeries";
import type { HistoricalPeriod } from "./historicalPeriod";
import { periodCsv } from "./periodCsv";
import {
  COMMUNITY_ID,
  HOME,
  SEPTEMBER_2026,
  derivedMembershipFigures,
  derivedSupplyFigures,
  member,
  membershipDay,
  membershipGapDay,
  membershipLatest,
  membershipMonth,
  membershipPartialDay,
  supplyBucket,
  supplyLatest,
} from "./historicalAnalysis.testData";

const TITLE = "Tus datos";
/** Euros as the app writes them, with the non-breaking space Intl puts before the sign. */
const eur = (value: number) => formatEuros(value);
const LOADING_LABEL = "Cargando la tabla de tus datos…";
const UNAVAILABLE = "La tabla estará disponible cuando se carguen tus datos.";
/** What the blocks that own the requests say when one fails: the charts (#250) and the period card (#249). */
const SERIES_ERROR = "No se pudo cargar la evolución de tu energía. Comprueba tu conexión e inténtalo de nuevo.";
const METRICS_ERROR = "No se pudieron cargar tus datos de energía. Comprueba tu conexión e inténtalo de nuevo.";
const DOWNLOAD = "Descargar CSV";

const pad = (value: number) => String(value).padStart(2, "0");
/** The 30 days of September 2026, the anchor month, as bucket dates. */
const SEPTEMBER_DAYS = Array.from({ length: 30 }, (_, index) => `2026/09/${pad(index + 1)}`);
/** 1 July to 31 August 2026: the longest daily period, 62 days. */
const JULY_AUGUST_DAYS = [
  ...Array.from({ length: 31 }, (_, index) => `2026/07/${pad(index + 1)}`),
  ...Array.from({ length: 31 }, (_, index) => `2026/08/${pad(index + 1)}`),
];
const LONGEST_DAILY = "?period=custom&from=2026-07-01&to=2026-08-31";

/**
 * Every day 0.333 kWh and 0.38 €: the rows of September add up to 9,99 kWh
 * and 11,40 €, while the energy metrics say 10 kWh and 11,41 €, as rounding
 * per day and per period can. The totals row must show the second.
 */
const DAY = { selfConsumptionKWh: 0.333, gridImportKWh: 1.25, surplusKWh: 0.5, savingsEur: 0.38 };
const PERIOD_FIGURES: MembershipEnergyMetricsResponse = derivedMembershipFigures({
  energy: { ...derivedMembershipFigures().energy, selfConsumptionKWh: 10, gridImportKWh: 37.5, surplusKWh: 15 },
  savings: { ...derivedMembershipFigures().savings, amountEur: 11.41, estimatedPrice: { eurPerKWh: 0.15 } },
});

type Options = { query?: { enabled?: boolean } } | undefined;
type State = "ready" | "loading" | "error";
const isAnchorCall = (params: unknown) => typeof params === "object" && params !== null && "period" in params;

let membershipDaily: MembershipDailyConsumptionBucketResponse[];
let membershipFigures: MembershipEnergyMetricsResponse;
let seriesState: State;
let metricsState: State;
const failedSeries = query.error(apiError(500));
const failedMetrics = query.error(apiError(500));

function answer<T>(options: unknown, state: State, failed: unknown, data: () => T) {
  if ((options as Options)?.query?.enabled === false) return query.disabled();
  if (state === "loading") return query.loading();
  if (state === "error") return failed;
  return query.success(data() as never);
}

function serve(supplies: SupplyResponse[]) {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
    options?.query?.enabled === false ? query.disabled() : query.success<typeof getSuppliesByUserId>(supplies),
  );
  vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_c, _u, params, options) => {
    if (options?.query?.enabled === false) return query.disabled();
    if (isAnchorCall(params)) return query.success<typeof getMembershipEnergyMetrics>(membershipLatest(SEPTEMBER_2026));
    return answer(options, metricsState, failedMetrics, () => membershipFigures) as ReturnType<typeof useGetMembershipEnergyMetrics>;
  });
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((supplyId, params, options) => {
    if (options?.query?.enabled === false) return query.disabled();
    const supply = supplies.find(({ id }) => id === supplyId)!;
    return query.success<typeof getSupplyEnergyMetrics>(
      isAnchorCall(params) ? supplyLatest(supply, SEPTEMBER_2026) : derivedSupplyFigures(supply, { savings: { ...PERIOD_FIGURES.savings, estimatedPrice: null } }),
    );
  });
  vi.mocked(useGetMembershipDailyConsumption).mockImplementation(
    (_c, _u, _p, options) => answer(options, seriesState, failedSeries, () => membershipDaily) as ReturnType<typeof useGetMembershipDailyConsumption>,
  );
  vi.mocked(useGetMembershipMonthlyConsumption).mockImplementation(
    (_c, _u, _p, options) =>
      answer(options, seriesState, failedSeries, () =>
        ["2025/10/01", "2025/11/01", "2025/12/01", "2026/01/01", "2026/02/01", "2026/03/01", "2026/04/01", "2026/05/01", "2026/06/01", "2026/07/01", "2026/08/01", "2026/09/01"].map((date) =>
          membershipMonth(date),
        ),
      ) as ReturnType<typeof useGetMembershipMonthlyConsumption>,
  );
  vi.mocked(useGetSupplyDailyConsumption).mockImplementation(
    (_s, _p, options) =>
      answer(options, seriesState, failedSeries, () => SEPTEMBER_DAYS.map((date) => supplyBucket(date))) as ReturnType<
        typeof useGetSupplyDailyConsumption
      >,
  );
  vi.mocked(useGetSupplyMonthlyConsumption).mockImplementation((_s, _p, options) =>
    (options as Options)?.query?.enabled === false ? query.disabled() : query.loading(),
  );
}

/** jsdom answers no media query, which reads as a phone; this answers every (min-width) query as a wide screen. */
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

function renderPage(search = "") {
  return renderWithProviders(<HistoricalAnalysisPage />, { route: `/historical-analysis${search}`, activeCommunityId: COMMUNITY_ID });
}

const region = () => screen.getByRole("region", { name: TITLE });
const table = () => within(region()).getByRole("table");
/** The body's rows, each as its cells' text. */
const bodyRows = () =>
  within(within(table()).getAllByRole("rowgroup")[1])
    .getAllByRole("row")
    .map((row) => [...within(row).queryAllByRole("rowheader"), ...within(row).queryAllByRole("cell")].map((cell) => cell.textContent));
const totalsRow = () => within(table()).getByRole("row", { name: /Total del periodo/ });
/** The phone layout's cards, each as its text. */
const cards = () => within(within(region()).getByRole("list", { name: /^Tus datos:/ })).getAllByRole("listitem");

const SEPTEMBER: HistoricalPeriod = { ...SEPTEMBER_2026, granularity: "daily", label: "Septiembre de 2026" };

beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = member();
  seriesState = "ready";
  metricsState = "ready";
  membershipDaily = SEPTEMBER_DAYS.map((date) => membershipDay(date, DAY));
  membershipFigures = PERIOD_FIGURES;
  serve([HOME]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UI-HIS-021 one row per chart slot, with the same states and words (#251)", () => {
  beforeEach(wideScreen);

  it("UI-HIS-021 a table with a caption, column headers and a row header per slot, under the evolution card", () => {
    renderPage();

    const grid = table();
    expect(grid.querySelector("caption")).toHaveTextContent("Tus datos: Septiembre de 2026, por días");
    const headers = within(grid).getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual(["Día", "De la comunidad", "De la red", "Se fue a la red", "Ahorro estimado", "Datos"]);
    headers.forEach((header) => expect(header).toHaveAttribute("scope", "col"));
    const rowHeaders = within(grid).getAllByRole("rowheader");
    rowHeaders.forEach((header) => expect(header).toHaveAttribute("scope", "row"));
    expect(rowHeaders[0]).toHaveTextContent("1 de septiembre de 2026");
    const sections = screen.getAllByRole("region").map((section) => section.getAttribute("aria-label"));
    expect(sections.indexOf(TITLE)).toBe(sections.indexOf("Tu energía día a día") + 1);
  });

  it("UI-HIS-021 the rows follow the chart's axis, and a gap, a measured zero and a partial day say so", () => {
    membershipDaily = [
      membershipDay("2026/09/01", { selfConsumptionKWh: 2.5, gridImportKWh: 7.75, surplusKWh: 1.75, savingsEur: 0.38 }),
      membershipGapDay("2026/09/02"),
      membershipDay("2026/09/03", { selfConsumptionKWh: 0, gridImportKWh: 0, surplusKWh: 0, savingsEur: 0 }),
      membershipPartialDay("2026/09/04", 1, 2),
      ...SEPTEMBER_DAYS.slice(4).map((date) => membershipDay(date, DAY)),
    ];
    renderPage();

    expect(bodyRows().slice(0, 4)).toEqual([
      ["1 de septiembre de 2026", "2,5 kWh", "7,75 kWh", "1,75 kWh", eur(0.38), "Completo"],
      ["2 de septiembre de 2026", "—", "—", "—", "—", "Sin datos"],
      ["3 de septiembre de 2026", "0 kWh", "0 kWh", "0 kWh", eur(0), "Cero medido"],
      ["4 de septiembre de 2026", "2,5 kWh", "7,75 kWh", "1,75 kWh", eur(0.38), "Parcial: 1 de 2 puntos con datos"],
    ]);
  });

  it("UI-HIS-021 a monthly period has one row per month, headed \"Mes\"", () => {
    renderPage("?period=last12");

    expect(within(table()).getAllByRole("columnheader")[0]).toHaveTextContent("Mes");
    expect(bodyRows().map((row) => row[0])).toEqual([
      "Octubre de 2025",
      "Noviembre de 2025",
      "Diciembre de 2025",
      "Enero de 2026",
      "Febrero de 2026",
      "Marzo de 2026",
      "Abril de 2026",
    ]);
  });

  it("UI-HIS-021 seven rows show, then every row with \"Ver todos\", then seven again with \"Ver menos\"", async () => {
    renderPage();

    expect(bodyRows()).toHaveLength(7);
    expect(region()).toHaveTextContent("Mostrando 7 de 30 días.");
    await userEvent.click(within(region()).getByRole("button", { name: "Ver todos" }));
    expect(bodyRows()).toHaveLength(30);
    expect(bodyRows().map((row) => row[0]).at(-1)).toBe("30 de septiembre de 2026");
    expect(region()).toHaveTextContent("Mostrando 30 de 30 días.");
    expect(within(region()).getByRole("button", { name: "Ver menos" })).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(within(region()).getByRole("button", { name: "Ver menos" }));
    expect(bodyRows()).toHaveLength(7);
  });

  it("UI-HIS-021 the footer states the estimated price, and is left out without one", () => {
    const { unmount } = renderPage();
    expect(region()).toHaveTextContent("kWh · Ahorro estimado con 0,15 €/kWh. El CSV incluye las mismas filas y la columna «Datos».");
    unmount();

    membershipFigures = derivedMembershipFigures({ ...PERIOD_FIGURES, savings: { ...PERIOD_FIGURES.savings, estimatedPrice: null } });
    renderPage();
    expect(region()).not.toHaveTextContent("Ahorro estimado con");
    expect(table()).toBeInTheDocument();
  });
});

describe("UI-HIS-022 the totals row is the energy-metrics totals, never a sum of rows (#251)", () => {
  beforeEach(wideScreen);

  it("UI-HIS-022 the totals row shows the energy metrics, which differ from the rows' sum by rounding", () => {
    renderPage();

    const cells = within(totalsRow()).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual(["10 kWh", "37,5 kWh", "15 kWh", eur(11.41), "30 de 30 días completos"]);
    // What the 30 rows add up to: 9,99 kWh and 11,40 €.
    expect(totalsRow()).not.toHaveTextContent("9,99 kWh");
    expect(totalsRow()).not.toHaveTextContent(eur(11.4));
  });

  it("UI-HIS-022 with gaps, the totals say how many days they add up", () => {
    membershipDaily = SEPTEMBER_DAYS.map((date, index) => (index < 3 ? membershipGapDay(date) : membershipDay(date, DAY)));
    renderPage();

    expect(within(totalsRow()).getAllByRole("cell").at(-1)).toHaveTextContent("Suma 27 de 30 días con datos");
  });

  it("UI-HIS-022 with partial days and no gap, the totals say how many are partial", () => {
    membershipDaily = SEPTEMBER_DAYS.map((date, index) => (index < 2 ? membershipPartialDay(date) : membershipDay(date, DAY)));
    renderPage();

    expect(within(totalsRow()).getAllByRole("cell").at(-1)).toHaveTextContent("30 de 30 días con datos; 2 parciales");
  });
});

describe("UI-HIS-021 loading and failure (#251)", () => {
  it("UI-HIS-021 while the series is pending, a placeholder stands in the table's place, and the download is disabled", () => {
    seriesState = "loading";
    renderPage();

    expect(screen.getByRole("progressbar", { name: LOADING_LABEL })).toBeInTheDocument();
    expect(within(region()).queryByRole("table")).not.toBeInTheDocument();
    expect(within(region()).getByRole("button", { name: DOWNLOAD })).toBeDisabled();
    expect(within(region()).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UI-HIS-021 while the metrics are pending, a placeholder stands in the table's place, and the download is disabled", () => {
    metricsState = "loading";
    renderPage();

    expect(within(region()).getByRole("progressbar", { name: LOADING_LABEL })).toBeInTheDocument();
    expect(within(region()).queryByRole("table")).not.toBeInTheDocument();
    expect(within(region()).getByRole("button", { name: DOWNLOAD })).toBeDisabled();
  });

  it("UI-HIS-021 a failed series is the charts' one alert; the table says it will be available, and the download is disabled", async () => {
    seriesState = "error";
    renderPage();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(SERIES_ERROR);
    expect(within(region()).queryByRole("alert")).not.toBeInTheDocument();
    expect(region()).toHaveTextContent(UNAVAILABLE);
    expect(within(region()).queryByRole("table")).not.toBeInTheDocument();
    expect(within(region()).getByRole("button", { name: DOWNLOAD })).toBeDisabled();
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(failedSeries.refetch).toHaveBeenCalled();
  });

  it("UI-HIS-021 failed metrics are the period card's one alert; the table says it will be available, and the download is disabled", async () => {
    metricsState = "error";
    renderPage();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(METRICS_ERROR);
    expect(within(region()).queryByRole("alert")).not.toBeInTheDocument();
    expect(region()).toHaveTextContent(UNAVAILABLE);
    expect(within(region()).getByRole("button", { name: DOWNLOAD })).toBeDisabled();
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(failedMetrics.refetch).toHaveBeenCalled();
  });

  it("UI-HIS-021 with both requests failed, the page holds one alert per request, and none in the table", () => {
    seriesState = "error";
    metricsState = "error";
    renderPage();

    const alerts = screen.getAllByRole("alert").map((alert) => alert.textContent);
    expect(alerts).toHaveLength(2);
    expect(alerts.some((text) => text?.includes(SERIES_ERROR))).toBe(true);
    expect(alerts.some((text) => text?.includes(METRICS_ERROR))).toBe(true);
    expect(within(region()).queryByRole("alert")).not.toBeInTheDocument();
    expect(region()).toHaveTextContent(UNAVAILABLE);
  });
});

describe("UI-HIS-023 \"Descargar CSV\" (#251)", () => {
  /** Records what the browser is handed to save. jsdom has no object URLs. */
  function captureDownloads() {
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:conluz-test";
    });
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    return { blobs, names, revokeObjectURL };
  }

  /** jsdom's Blob has no arrayBuffer(); its FileReader reads the bytes, BOM included. */
  function bytesOf(blob: Blob): Promise<Uint8Array> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(blob);
    });
  }

  afterEach(() => {
    Object.assign(URL, { createObjectURL: undefined, revokeObjectURL: undefined });
  });

  it("UI-HIS-023 downloads every slot of the period as the pure CSV, named after the scope and the days shown, and revokes the URL", async () => {
    membershipDaily = SEPTEMBER_DAYS.map((date, index) => (index === 1 ? membershipGapDay(date) : membershipDay(date, DAY)));
    const downloads = captureDownloads();
    renderPage();

    await userEvent.click(within(region()).getByRole("button", { name: DOWNLOAD }));

    const expected = periodCsv(
      toConsumptionSeriesView(SEPTEMBER, { kind: "membershipDaily", buckets: membershipDaily }).slots,
      "daily",
      PERIOD_FIGURES.savings.estimatedPrice,
    );
    expect(downloads.blobs).toHaveLength(1);
    expect(downloads.blobs[0].type).toBe("text/csv;charset=utf-8");
    const bytes = await bytesOf(downloads.blobs[0]);
    expect(Array.from(bytes)).toEqual(Array.from(new TextEncoder().encode(expected)));
    expect(expected.split("\r\n")).toHaveLength(1 + 30 + 1);
    expect(downloads.names).toEqual(["conluz-consumo-todos-2026-09-01-2026-09-30.csv"]);
    expect(downloads.revokeObjectURL).toHaveBeenCalledWith("blob:conluz-test");
  });

  it("UI-HIS-024 a single supply's file is named after its slug", async () => {
    serve([{ ...HOME, name: "Taller Moreño" }]);
    const downloads = captureDownloads();
    renderPage(`?supplyId=${HOME.id}`);

    await userEvent.click(within(region()).getByRole("button", { name: DOWNLOAD }));

    expect(downloads.names).toEqual(["conluz-consumo-taller-moreno-2026-09-01-2026-09-30.csv"]);
  });
});

describe("UI-HIS-021 below sm, one card per row (#251)", () => {
  it("UI-HIS-021 cards replace the table, with the same content, the totals last, and the same paging", async () => {
    membershipDaily = [membershipGapDay("2026/07/01"), ...JULY_AUGUST_DAYS.slice(1).map((date) => membershipDay(date, DAY))];
    renderPage(LONGEST_DAILY);

    expect(within(region()).queryByRole("table")).not.toBeInTheDocument();
    expect(cards()).toHaveLength(7 + 1);
    const [gap] = cards();
    expect(gap).toHaveAccessibleName("1 de julio de 2026");
    expect(gap).toHaveTextContent("Sin datos");
    expect(within(gap).getAllByRole("definition").map((value) => value.textContent)).toEqual(["—", "—", "—", "—"]);
    const second = cards()[1];
    expect(within(second).getAllByRole("term").map((term) => term.textContent)).toEqual([
      "De la comunidad",
      "De la red",
      "Se fue a la red",
      "Ahorro estimado",
    ]);
    expect(within(second).getAllByRole("definition").map((value) => value.textContent)).toEqual(["0,33 kWh", "1,25 kWh", "0,5 kWh", eur(0.38)]);
    const total = cards().at(-1)!;
    expect(total).toHaveAccessibleName("Total del periodo");
    expect(total).toHaveTextContent("Suma 61 de 62 días con datos");
    expect(region()).toHaveTextContent("Mostrando 7 de 62 días.");

    await userEvent.click(within(region()).getByRole("button", { name: "Ver todos" }));
    expect(cards()).toHaveLength(62 + 1);
    await userEvent.click(within(region()).getByRole("button", { name: "Ver menos" }));
    expect(cards()).toHaveLength(7 + 1);
  });
});

// The fetchers are named only so query.success types its data.
void [getSupplyDailyConsumption, getMembershipDailyConsumption, getMembershipMonthlyConsumption];
