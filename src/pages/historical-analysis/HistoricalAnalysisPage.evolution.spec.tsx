import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApexOptions } from "apexcharts";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import type {
  CurrentUserResponse,
  MembershipDailyConsumptionBucketResponse,
  SupplyConsumptionBucketResponse,
  SupplyResponse,
} from "../../api/models";

const { Chart } = vi.hoisted(() => ({
  Chart: vi.fn<(props: { series: { name: string; group: string; data: (number | null)[] }[]; options: ApexOptions }) => null>(() => null),
}));
// ApexCharts cannot lay out in jsdom: the stub records what each chart is told to draw.
vi.mock("react-apexcharts", () => ({ default: Chart }));

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
  getSupplyMonthlyConsumption,
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
import { MEASURED_ZERO_EUR_TEXT, SELF_CONSUMPTION_SERIES, SAVINGS_SERIES } from "./consumptionSeries";
import {
  COMMUNITY_ID,
  HOME,
  OWNER_ID,
  PLANT_SUPPLY,
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
  supplyGapDay,
  supplyLatest,
  supplyMeasuredZeroDay,
} from "./historicalAnalysis.testData";

const DAILY_TITLE = "Tu energía día a día";
const MONTHLY_TITLE = "Tu energía mes a mes";
const LAST_12 = { startDate: "2025-10-01T00:00:00+02:00", endDate: "2026-10-01T00:00:00+02:00" };
const PLANT_LINE = "En el punto de la planta, «se fue a la red» siempre es 0 kWh.";
const GAP_DAY = "Sin datos: no hay lecturas de este día. No cuenta como 0.";

type Options = { query?: { enabled?: boolean } } | undefined;
const isAnchorCall = (params: unknown) => typeof params === "object" && params !== null && "period" in params;
const pad = (value: number) => String(value).padStart(2, "0");
/** The 30 days of September 2026, the anchor month, as bucket dates. */
const SEPTEMBER_DAYS = Array.from({ length: 30 }, (_, index) => `2026/09/${pad(index + 1)}`);
/** October 2025 to September 2026, "Últimos 12 meses" against the September anchor. */
const LAST_12_MONTHS = Array.from({ length: 12 }, (_, index) => {
  const month = ((9 + index) % 12) + 1;
  return `${index < 3 ? 2025 : 2026}/${pad(month)}/01`;
});

let membershipDaily: MembershipDailyConsumptionBucketResponse[];
let supplyDaily: SupplyConsumptionBucketResponse[];
let seriesState: "ready" | "loading" | "error";
const failed = query.error(apiError(500));

function serve(supplies: SupplyResponse[]) {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
    options?.query?.enabled === false ? query.disabled() : query.success<typeof getSuppliesByUserId>(supplies),
  );
  vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_c, _u, params, options) => {
    if (options?.query?.enabled === false) return query.disabled();
    return query.success<typeof getMembershipEnergyMetrics>(isAnchorCall(params) ? membershipLatest(SEPTEMBER_2026) : derivedMembershipFigures());
  });
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((supplyId, params, options) => {
    if (options?.query?.enabled === false) return query.disabled();
    const supply = supplies.find(({ id }) => id === supplyId)!;
    return query.success<typeof getSupplyEnergyMetrics>(isAnchorCall(params) ? supplyLatest(supply, SEPTEMBER_2026) : derivedSupplyFigures(supply));
  });
}

/** Each series hook answers only when enabled, in the state the test sets. */
function answer<T>(options: unknown, data: () => T) {
  if ((options as Options)?.query?.enabled === false) return query.disabled();
  if (seriesState === "loading") return query.loading();
  if (seriesState === "error") return failed;
  return query.success(data() as never);
}

function serveSeries() {
  vi.mocked(useGetMembershipDailyConsumption).mockImplementation(
    (_c, _u, _p, options) => answer(options, () => membershipDaily) as ReturnType<typeof useGetMembershipDailyConsumption>,
  );
  vi.mocked(useGetMembershipMonthlyConsumption).mockImplementation(
    (_c, _u, _p, options) =>
      answer(options, () => LAST_12_MONTHS.map((date) => membershipMonth(date))) as ReturnType<typeof useGetMembershipMonthlyConsumption>,
  );
  vi.mocked(useGetSupplyDailyConsumption).mockImplementation(
    (_s, _p, options) => answer(options, () => supplyDaily) as ReturnType<typeof useGetSupplyDailyConsumption>,
  );
  vi.mocked(useGetSupplyMonthlyConsumption).mockImplementation(
    (_s, _p, options) =>
      answer(options, () => LAST_12_MONTHS.map((date) => supplyBucket(date))) as ReturnType<typeof useGetSupplyMonthlyConsumption>,
  );
}

function renderPage(search = "") {
  return renderWithProviders(<HistoricalAnalysisPage />, { route: `/historical-analysis${search}`, activeCommunityId: COMMUNITY_ID });
}

/** The last options each chart was drawn with. */
function chartProps(kind: "energy" | "savings") {
  const name = kind === "energy" ? SELF_CONSUMPTION_SERIES : SAVINGS_SERIES;
  const calls = Chart.mock.calls.filter(([props]) => props.series[0].name === name);
  return calls.at(-1)![0];
}

/** What a reader sees in a slot's tooltip, as text. */
function tooltipText(kind: "energy" | "savings", date: string): string {
  const { options } = chartProps(kind);
  const categories = options.xaxis!.categories as string[];
  const html = (options.tooltip!.custom as (args: { dataPointIndex: number }) => string)({ dataPointIndex: categories.indexOf(date) });
  const element = document.createElement("div");
  element.innerHTML = html;
  return element.textContent ?? "";
}

/** Which series hooks were last asked to run, and with what. */
function enabledSeriesCalls() {
  const hooks = {
    membershipDaily: useGetMembershipDailyConsumption,
    membershipMonthly: useGetMembershipMonthlyConsumption,
    supplyDaily: useGetSupplyDailyConsumption,
    supplyMonthly: useGetSupplyMonthlyConsumption,
  };
  return Object.fromEntries(
    Object.entries(hooks).flatMap(([name, hook]) => {
      const enabled = vi.mocked(hook).mock.calls.filter((call) => (call.at(-1) as Options)?.query?.enabled === true);
      return enabled.length ? [[name, enabled.at(-1)!.slice(0, -1)]] : [];
    }),
  );
}

const card = (title = DAILY_TITLE) => screen.getByRole("region", { name: title });

beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = member();
  seriesState = "ready";
  membershipDaily = SEPTEMBER_DAYS.map((date) => membershipDay(date));
  supplyDaily = SEPTEMBER_DAYS.map((date) => supplyBucket(date));
  serve([HOME, PLANT_SUPPLY]);
  serveSeries();
});

describe("UI-HIS-016 the series follow the scope and the period's granularity and bounds (#250)", () => {
  it("UI-HIS-016 'Todos mis puntos' by days asks only the membership daily series, by the period's bounds", () => {
    renderPage();
    expect(enabledSeriesCalls()).toEqual({ membershipDaily: [COMMUNITY_ID, OWNER_ID, SEPTEMBER_2026] });
    expect(card()).toBeInTheDocument();
  });

  it("UI-HIS-016 'Todos mis puntos' by months asks only the membership monthly series, by the period's bounds", () => {
    renderPage("?period=last12");
    expect(enabledSeriesCalls()).toEqual({ membershipMonthly: [COMMUNITY_ID, OWNER_ID, LAST_12] });
    expect(card(MONTHLY_TITLE)).toBeInTheDocument();
  });

  it("UI-HIS-016 a supply by days asks only that supply's daily series, by the period's bounds", () => {
    renderPage(`?supplyId=${HOME.id}`);
    expect(enabledSeriesCalls()).toEqual({ supplyDaily: [HOME.id, SEPTEMBER_2026] });
  });

  it("UI-HIS-016 a supply by months asks only that supply's monthly series, by the period's bounds", () => {
    renderPage(`?supplyId=${HOME.id}&period=last12`);
    expect(enabledSeriesCalls()).toEqual({ supplyMonthly: [HOME.id, LAST_12] });
  });

  it("UI-HIS-016 the axis has one slot per day of the period, whatever the series returns", () => {
    supplyDaily = [supplyBucket("2026/09/01"), supplyBucket("2026/09/02")];
    renderPage(`?supplyId=${HOME.id}`);

    expect(chartProps("energy").options.xaxis!.categories).toEqual(SEPTEMBER_DAYS);
    expect(card()).toHaveTextContent("Septiembre de 2026: 2 de 30 días con datos; faltan 28.");
  });
});

describe("UI-HIS-015 gaps, measured zeros and partial days are told apart in words (#250)", () => {
  it("UI-HIS-015 each state has its own words in the tooltip, and a gap shows no 0", () => {
    supplyDaily = SEPTEMBER_DAYS.map((date) =>
      date === "2026/09/02" ? supplyGapDay(date) : date === "2026/09/03" ? supplyMeasuredZeroDay(date) : supplyBucket(date),
    );
    renderPage(`?supplyId=${HOME.id}`);

    const complete = tooltipText("energy", "2026/09/01");
    expect(complete).toContain("1 de septiembre de 2026");
    expect(complete).toContain("Datos completos.");
    expect(complete).toContain("De la comunidad5,5 kWh");

    const gap = tooltipText("energy", "2026/09/02");
    expect(gap).toContain(GAP_DAY);
    expect(gap).not.toContain("kWh");
    expect(gap).not.toContain("€");
    expect(gap.replace(GAP_DAY, "")).not.toMatch(/\b0\b/);
    expect(chartProps("energy").series.map((series) => series.data[1])).toEqual([null, null, null]);

    const zero = tooltipText("energy", "2026/09/03");
    expect(zero).toContain("Datos completos.");
    expect(zero).toContain("De la comunidad0,0 kWh (medido)");
    expect(tooltipText("savings", "2026/09/03")).toContain(MEASURED_ZERO_EUR_TEXT);
    expect(MEASURED_ZERO_EUR_TEXT).toMatch(/^0,00\s€ \(medido\)$/);
  });

  it("UI-HIS-015 a partial day says how many supplies reported, naming none", () => {
    membershipDaily = SEPTEMBER_DAYS.map((date) => (date === "2026/09/05" ? membershipPartialDay(date, 1, 2) : membershipDay(date)));
    renderPage();

    const partial = tooltipText("energy", "2026/09/05");
    expect(partial).toContain("Datos parciales: 1 de 2 puntos con datos.");
    for (const supply of [HOME, PLANT_SUPPLY]) expect(partial).not.toContain(supply.name!);
    expect(tooltipText("energy", "2026/09/04")).toContain("Datos completos.");
  });

  it("UI-HIS-015 the key under the charts names every mark", () => {
    renderPage();

    const key = within(card()).getByRole("list", { name: "Marcas de estado" });
    // The asterisk is the mark itself, drawn as text and hidden from assistive technology.
    expect(within(key).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Sin datos: no hay lecturas",
      "Cero medido",
      "*Datos parciales",
    ]);
  });

  it("UI-HIS-015 the gaps notice gives one range per run of consecutive gaps", () => {
    membershipDaily = SEPTEMBER_DAYS.map((date) =>
      ["2026/09/03", "2026/09/04", "2026/09/10"].includes(date) ? membershipGapDay(date) : membershipDay(date),
    );
    renderPage();

    expect(
      within(card()).getByText(
        "Faltan datos del 3 al 4 de septiembre de 2026 y del 10 de septiembre de 2026. Los totales suman solo los días con datos.",
      ),
    ).toBeInTheDocument();
    expect(card()).toHaveTextContent("Septiembre de 2026: 27 de 30 días con datos; faltan 3.");
  });

  it("UI-HIS-015 the partial notice appears for 'Todos mis puntos' only", () => {
    membershipDaily = SEPTEMBER_DAYS.map((date) => (date === "2026/09/05" ? membershipPartialDay(date, 1, 2) : membershipDay(date)));
    const { unmount } = renderPage();
    expect(
      within(card()).getByText("En el 5 de septiembre de 2026 solo hay datos de 1 de tus 2 puntos. Ese día se marca como parcial."),
    ).toBeInTheDocument();
    expect(card()).toHaveTextContent("Septiembre de 2026: 30 de 30 días con datos; 1 con datos parciales.");
    unmount();

    renderPage(`?supplyId=${HOME.id}`);
    expect(card()).not.toHaveTextContent("solo hay datos de");
    expect(card()).toHaveTextContent("Septiembre de 2026: 30 de 30 días con datos.");
  });

  it("UI-HIS-015 a plant's own supply adds the plant line to every tooltip; another supply does not", () => {
    const { unmount } = renderPage(`?supplyId=${PLANT_SUPPLY.id}`);
    expect(tooltipText("energy", "2026/09/01")).toContain(PLANT_LINE);
    expect(tooltipText("savings", "2026/09/02")).toContain(PLANT_LINE);
    unmount();

    renderPage(`?supplyId=${HOME.id}`);
    expect(tooltipText("energy", "2026/09/01")).not.toContain(PLANT_LINE);
  });
});

describe("UI-HIS-017 the energy chart is option A (#250)", () => {
  it("UI-HIS-017 groups the legend into the consumption bar and the unused assigned energy, and explains the difference", () => {
    renderPage();

    expect(within(card()).getByRole("group", { name: "Tu consumo" })).toHaveTextContent("Tu consumo:De la comunidadDe la red");
    expect(within(card()).getByRole("group", { name: "Asignada que no usaste" })).toHaveTextContent("Asignada que no usaste:Se fue a la red");
    expect(card()).toHaveTextContent(
      "La barra apilada es tu consumo. La barra de al lado es energía asignada que no usaste: no forma parte de tu consumo.",
    );
    expect(card()).toHaveTextContent("Desliza el gráfico para ver todo el periodo.");

    const { options, series } = chartProps("energy");
    expect(options.chart!.stacked).toBe(true);
    expect(series.map(({ name, group }) => [name, group])).toEqual([
      ["De la comunidad", "consumption"],
      ["De la red", "consumption"],
      ["Se fue a la red", "assignedUnused"],
    ]);
  });
});

describe("UI-HIS-017 the savings legend states the estimated price (#250)", () => {
  it("UI-HIS-017 states the estimated price from the period's energy metrics when there is one", () => {
    renderPage();
    expect(within(card()).getByText("Estimado con un precio de 0,15 €/kWh para la energía, sin impuestos.")).toBeInTheDocument();
  });

  it("UI-HIS-017 states no price without estimatedPrice, even when tariffSource says ESTIMATE", () => {
    vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_c, _u, params, options) => {
      if (options?.query?.enabled === false) return query.disabled();
      if (isAnchorCall(params)) return query.success<typeof getMembershipEnergyMetrics>(membershipLatest(SEPTEMBER_2026));
      const figures = derivedMembershipFigures();
      return query.success<typeof getMembershipEnergyMetrics>({ ...figures, savings: { ...figures.savings, tariffSource: "ESTIMATE", estimatedPrice: null } });
    });
    renderPage();

    expect(within(card()).getByText("Ahorro estimado")).toBeInTheDocument();
    expect(card()).not.toHaveTextContent("Estimado con un precio de");
  });
});

describe("UI-HIS-016 loading and failure of the series (#250)", () => {
  it("UI-HIS-016 a placeholder stands in the charts' place while the series loads", () => {
    seriesState = "loading";
    renderPage();

    expect(screen.getByRole("progressbar", { name: "Cargando la evolución de tu energía…" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: DAILY_TITLE })).not.toBeInTheDocument();
  });

  it("UI-HIS-016 a failed series is an error with a retry, and no charts", async () => {
    seriesState = "error";
    renderPage();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo cargar la evolución de tu energía. Comprueba tu conexión e inténtalo de nuevo.");
    expect(screen.queryByRole("region", { name: DAILY_TITLE })).not.toBeInTheDocument();
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalled();
  });
});

// The fetchers are named only so query.success types its data.
void [getSupplyDailyConsumption, getSupplyMonthlyConsumption, getMembershipDailyConsumption, getMembershipMonthlyConsumption];
