import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import type {
  CurrentUserResponse,
  MembershipDailyConsumptionBucketResponse,
  SupplyConsumptionBucketResponse,
  SupplyResponse,
} from "../../api/models";

const { Chart } = vi.hoisted(() => ({ Chart: vi.fn(() => null) }));
// Below sm no chart is drawn: the stub proves it.
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
import { formatEuros } from "../../utils/formatEnergyFigures";
import { HistoricalAnalysisPage } from "./HistoricalAnalysisPage";
import {
  COMMUNITY_ID,
  HOME,
  PLANT_SUPPLY,
  SEPTEMBER_2026,
  derivedMembershipFigures,
  derivedSupplyFigures,
  member,
  membershipDay,
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

const card = (title = DAILY_TITLE) => screen.getByRole("region", { name: title });
const energyRows = (title = DAILY_TITLE, unit = "día") =>
  within(within(card(title)).getByRole("list", { name: `Tu energía por ${unit}` })).getAllByRole("button");
const savingsRows = (title = DAILY_TITLE, unit = "día") =>
  within(within(card(title)).getByRole("list", { name: `Tu ahorro estimado por ${unit}` })).getAllByRole("listitem");
/** A row's label: the first thing it reads. */
const labelOf = (row: HTMLElement) => row.firstElementChild?.textContent;
/** The detail an open row controls. */
const detailOf = (row: HTMLElement) => document.getElementById(row.getAttribute("aria-controls") ?? "")!;
const WIDE_CAPTION = "La barra apilada es tu consumo. La barra morada, a su lado, es energía asignada que no usaste: no forma parte de tu consumo.";

// jsdom answers no media query, which reads as a phone: every test here is below sm.
beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = member();
  seriesState = "ready";
  membershipDaily = SEPTEMBER_DAYS.map((date) => membershipDay(date));
  supplyDaily = SEPTEMBER_DAYS.map((date) => supplyBucket(date));
  serve([HOME, PLANT_SUPPLY]);
  serveSeries();
});

describe("UI-HIS-025 below sm, the evolution charts are rows (#361)", () => {
  it("UI-HIS-025 each chart is a row per day, in axis order, and nothing is drawn as a chart", () => {
    renderPage(`?supplyId=${HOME.id}`);

    expect(Chart).not.toHaveBeenCalled();
    expect(energyRows()).toHaveLength(30);
    expect(savingsRows()).toHaveLength(30);
    // 5,5 kWh from the community and 12,5 kWh from the grid: 18 kWh consumed.
    expect(energyRows()[0]).toHaveAccessibleName("1 de septiembre de 2026: 18 kWh");
    expect(energyRows()[0]).toHaveTextContent(/^1 sept18$/);
    expect(energyRows()[29]).toHaveAccessibleName("30 de septiembre de 2026: 18 kWh");
    expect(savingsRows()[0]).toHaveAccessibleName(`1 de septiembre de 2026: ${formatEuros(0.83)}`);
    expect(savingsRows()[0]).toHaveTextContent(/^1 sept0,83\s€$/);
  });

  it("UI-HIS-018 every row carries its own label, read from the bucket's date", () => {
    renderPage(`?supplyId=${HOME.id}`);

    expect(energyRows().map(labelOf)).toEqual(
      SEPTEMBER_DAYS.map((_date, index) => `${index + 1} sept`),
    );
  });

  it("UI-HIS-025 a monthly period has a row per month, named by its month and year", () => {
    renderPage(`?period=last12&supplyId=${HOME.id}`);

    const rows = energyRows(MONTHLY_TITLE, "mes");
    expect(rows).toHaveLength(12);
    expect(rows.map(labelOf)).toEqual([
      "oct 25",
      "nov 25",
      "dic 25",
      "ene 26",
      "feb 26",
      "mar 26",
      "abr 26",
      "may 26",
      "jun 26",
      "jul 26",
      "ago 26",
      "sept 26",
    ]);
    expect(rows[3]).toHaveAccessibleName("Enero de 2026: 18 kWh");
  });

  it("UI-HIS-025 a gap reads \"Sin datos\" with no figure; a measured zero and a partial day say so in their names", () => {
    supplyDaily = SEPTEMBER_DAYS.map((date) =>
      date === "2026/09/02" ? supplyGapDay(date) : date === "2026/09/03" ? supplyMeasuredZeroDay(date) : supplyBucket(date),
    );
    const { unmount } = renderPage(`?supplyId=${HOME.id}`);

    const [, gap, zero] = energyRows();
    expect(gap).toHaveAccessibleName("2 de septiembre de 2026: sin datos");
    expect(gap).toHaveTextContent(/^2 septSin datos—$/);
    expect(gap.textContent).not.toMatch(/\b0\b/);
    expect(savingsRows()[1]).toHaveAccessibleName("2 de septiembre de 2026: sin datos");
    expect(savingsRows()[1]).toHaveTextContent(/^2 septSin datos—$/);
    expect(zero).toHaveAccessibleName("3 de septiembre de 2026: 0,0 kWh (medido)");
    expect(zero).toHaveTextContent(/^3 sept0$/);
    unmount();

    membershipDaily = SEPTEMBER_DAYS.map((date) => (date === "2026/09/05" ? membershipPartialDay(date, 1, 2) : membershipDay(date)));
    renderPage();
    const partial = energyRows()[4];
    expect(partial).toHaveAccessibleName("5 de septiembre de 2026: 10,25 kWh, datos parciales");
    // The asterisk is the mark itself, hidden from assistive technology like the key's.
    expect(partial).toHaveTextContent(/^5 sept\*10,25$/);
    expect(savingsRows()[4]).toHaveAccessibleName(`5 de septiembre de 2026: ${formatEuros(0.38)}, datos parciales`);
  });

  it("UI-HIS-025 the energy rows sit under a scale that names the unit, and the figure column \"Consumo\"", () => {
    renderPage(`?supplyId=${HOME.id}`);

    // 18 kWh is the longest bar: the scale ends at 20 kWh.
    const list = within(card()).getByRole("list", { name: "Tu energía por día" });
    expect(list.previousElementSibling).toHaveTextContent(/^0 kWh10 kWh20 kWhConsumo$/);
    expect(list.previousElementSibling).toHaveAttribute("aria-hidden", "true");
  });

  it("UI-HIS-017 the mobile caption says the unused bar sits beneath, and there is no hint to slide", () => {
    renderPage();

    expect(card()).toHaveTextContent(
      "La barra gruesa es tu consumo. La fina morada, debajo, es energía asignada que no usaste: no forma parte de tu consumo.",
    );
    expect(card()).not.toHaveTextContent(WIDE_CAPTION);
    expect(card()).not.toHaveTextContent("Desliza");
    expect(within(card()).getByRole("group", { name: "Tu consumo" })).toHaveTextContent("Tu consumo:De la comunidad · autoconsumoDe la red");
  });
});

describe("UI-HIS-026 below sm, an energy row opens its detail (#361)", () => {
  it("UI-HIS-026 each row is a collapsed button; activating it opens the tooltip's content beneath it, and again closes it", async () => {
    renderPage(`?supplyId=${HOME.id}`);

    const row = energyRows()[0];
    expect(row.tagName).toBe("BUTTON");
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(row).not.toHaveAttribute("aria-controls");

    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    const detail = detailOf(row);
    expect(row.parentElement!.contains(detail)).toBe(true);
    expect(row.compareDocumentPosition(detail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(detail.textContent).toBe(
      [
        "1 de septiembre de 2026",
        "Datos completos.",
        "De la comunidad · autoconsumo5,5 kWh",
        "De la red12,5 kWh",
        "Se fue a la red · excedentes3,25 kWh",
        `Ahorro estimado${formatEuros(0.83)}`,
      ].join(""),
    );

    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(detail).not.toBeInTheDocument();
  });

  it("UI-HIS-026 opening a row closes the one that was open, and the keyboard opens it too", async () => {
    renderPage(`?supplyId=${HOME.id}`);

    const [first, second] = energyRows();
    await userEvent.click(first);
    second.focus();
    await userEvent.keyboard("{Enter}");
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(energyRows().filter((row) => row.getAttribute("aria-expanded") === "true")).toEqual([second]);
    expect(detailOf(second)).toHaveTextContent("2 de septiembre de 2026");
    expect(screen.getAllByText("Datos completos.")).toHaveLength(1);
  });

  it("UI-HIS-026 a gap's detail says so and gives no figure; a partial day's says how many supplies reported", async () => {
    supplyDaily = SEPTEMBER_DAYS.map((date) => (date === "2026/09/02" ? supplyGapDay(date) : supplyBucket(date)));
    const { unmount } = renderPage(`?supplyId=${HOME.id}`);

    await userEvent.click(energyRows()[1]);
    const gap = detailOf(energyRows()[1]);
    expect(gap.textContent).toBe(`2 de septiembre de 2026${GAP_DAY}`);
    unmount();

    membershipDaily = SEPTEMBER_DAYS.map((date) => (date === "2026/09/05" ? membershipPartialDay(date, 1, 2) : membershipDay(date)));
    renderPage();
    await userEvent.click(energyRows()[4]);
    const partial = detailOf(energyRows()[4]);
    expect(partial).toHaveTextContent("Datos parciales: 1 de 2 puntos con datos.");
    for (const supply of [HOME, PLANT_SUPPLY]) expect(partial).not.toHaveTextContent(supply.name!);
  });

  it("UI-HIS-026 a plant's own supply adds the plant line to the detail; another supply does not", async () => {
    const { unmount } = renderPage(`?supplyId=${PLANT_SUPPLY.id}`);
    await userEvent.click(energyRows()[0]);
    expect(detailOf(energyRows()[0])).toHaveTextContent(PLANT_LINE);
    unmount();

    renderPage(`?supplyId=${HOME.id}`);
    await userEvent.click(energyRows()[0]);
    expect(detailOf(energyRows()[0])).not.toHaveTextContent(PLANT_LINE);
  });

  it("UI-HIS-027 the detail pairs each technical term with its home term, and names neither alone", async () => {
    renderPage(`?supplyId=${HOME.id}`);

    await userEvent.click(energyRows()[0]);
    const detail = detailOf(energyRows()[0]);
    expect(within(detail).getByText("· autoconsumo").parentElement).toHaveTextContent("De la comunidad · autoconsumo");
    expect(within(detail).getByText("· excedentes").parentElement).toHaveTextContent("Se fue a la red · excedentes");
  });

  it("UI-HIS-026 the savings rows are not buttons: the energy row's detail already holds the savings", () => {
    renderPage(`?supplyId=${HOME.id}`);

    for (const row of savingsRows()) expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  });
});

// The fetchers are named only so query.success types its data.
void [getSupplyDailyConsumption, getSupplyMonthlyConsumption, getMembershipDailyConsumption, getMembershipMonthlyConsumption];
