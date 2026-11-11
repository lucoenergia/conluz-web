import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMemberRecord,
  buildSupply,
  buildSupplyCapabilities,
} from "../../test/fixtures";
import { formatEuros, formatKilowattHours } from "../../utils/formatEnergyFigures";
import type { SupplyCapabilitiesResponse, SupplyEnergyMetricsResponse, SupplyResponse } from "../../api/models";

vi.mock(import("./useSupplyInActiveCommunity"), () => ({ useSupplyInActiveCommunity: vi.fn() }));

// The section under its own gate makes its own request, and is not this file's subject.
vi.mock(import("../../components/SupplyCoefficientHistorySection"), () => ({
  SupplyCoefficientHistorySection: () => null,
}));

// A chart, were the page to render one again, shows up as this marker.
// String form: the typed one cannot express this module's default export.
vi.mock("react-apexcharts", () => ({ default: () => <div>CHART</div> }));

// The series hooks the page used to read are mocked only to prove it never calls them again.
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupplyEnergyMetrics: vi.fn(),
  useGetSupplyHourlyProduction: vi.fn(),
  useGetSupplyDailyProduction: vi.fn(),
  useGetSupplyMonthlyProduction: vi.fn(),
  useGetSupplyHourlyConsumption: vi.fn(),
  useGetSupplyDailyConsumption: vi.fn(),
  useGetSupplyMonthlyConsumption: vi.fn(),
  useGetSupplyYearlyConsumption: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import {
  getSupplyEnergyMetrics,
  useGetSupplyDailyConsumption,
  useGetSupplyDailyProduction,
  useGetSupplyEnergyMetrics,
  useGetSupplyHourlyConsumption,
  useGetSupplyHourlyProduction,
  useGetSupplyMonthlyConsumption,
  useGetSupplyMonthlyProduction,
  useGetSupplyYearlyConsumption,
} from "../../api/supplies/supplies";
import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { SupplyDetailPage } from "./SupplyDetailPage";
import { AUGUST_2026, NOTHING_PUBLISHED, derivedSupplyFigures } from "../historical-analysis/historicalAnalysis.testData";
import { plantSupplyNotice } from "../../components/EnergyFigures/periodUsage";

const SUPPLY_ID = "supply-1";
const COMMUNITY_ID = "community-a";
const LATEST_PUBLISHED_MONTH = { period: "LATEST_PUBLISHED_MONTH" };
const SUMMARY = "Último mes publicado";
const FULL_ANALYSIS = "Ver análisis completo";

const SERIES_HOOKS = [
  useGetSupplyHourlyProduction,
  useGetSupplyDailyProduction,
  useGetSupplyMonthlyProduction,
  useGetSupplyHourlyConsumption,
  useGetSupplyDailyConsumption,
  useGetSupplyMonthlyConsumption,
  useGetSupplyYearlyConsumption,
];

function supplyWith(overrides: Partial<SupplyResponse> = {}, capabilities: Partial<SupplyCapabilitiesResponse> = { canRead: true }) {
  return buildSupply({
    id: SUPPLY_ID,
    name: "Casa de Lucía",
    code: "ES0021000000000000AA",
    community: { id: COMMUNITY_ID, name: "Sol Común" },
    user: { id: "owner-1" },
    ownerRecord: buildMemberRecord({ fullName: "Lucía Martínez Soler" }),
    capabilities: buildSupplyCapabilities(capabilities),
    ...overrides,
  });
}

type Metrics = ReturnType<typeof useGetSupplyEnergyMetrics>;

function render(supply: SupplyResponse, metrics: Metrics, { communityCanRead = true } = {}) {
  vi.mocked(useSupplyInActiveCommunity).mockReturnValue({ supply, isLoading: false, isNotFound: false, error: null, refetch: vi.fn() });
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((_id, _params, options) =>
    options?.query?.enabled === false ? query.disabled() : metrics,
  );
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canRead: communityCanRead }) }),
    ),
  );
  return renderWithProviders(<SupplyDetailPage />, { route: `/supply-points/${SUPPLY_ID}`, activeCommunityId: COMMUNITY_ID });
}

const published = (figures: SupplyEnergyMetricsResponse) => query.success<typeof getSupplyEnergyMetrics>(figures);
const summary = () => screen.getByRole("region", { name: SUMMARY });
const enabledMetricsCalls = () => vi.mocked(useGetSupplyEnergyMetrics).mock.calls.filter(([, , options]) => options?.query?.enabled !== false);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UI-SUP-014 the supply detail page shows the latest published month, with no period selector or chart (#252)", () => {
  it("UI-SUP-014 AC1 shows no period filter, no Consumo or Eficiencia card and no chart, and calls none of the series hooks", () => {
    render(supplyWith(), published(derivedSupplyFigures(supplyWith(), { period: AUGUST_2026 })));

    expect(summary()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Consumo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Eficiencia" })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Rango:/)).not.toBeInTheDocument();
    expect(screen.queryByText("CHART")).not.toBeInTheDocument();
    // The removed period filter's controls: its range buttons and a date input.
    expect(screen.queryByRole("button", { name: /^(Día|Mes|Año|Totales|Fechas)$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    for (const hook of SERIES_HOOKS) expect(hook).not.toHaveBeenCalled();
  });

  it("UI-SUP-014 AC2 asks the supply's energy metrics for LATEST_PUBLISHED_MONTH, never for dates from the device", () => {
    render(supplyWith(), published(derivedSupplyFigures(supplyWith(), { period: AUGUST_2026 })));

    const calls = enabledMetricsCalls();
    expect(calls.length).toBeGreaterThan(0);
    for (const [supplyId, params] of calls) {
      expect(supplyId).toBe(SUPPLY_ID);
      expect(params).toEqual(LATEST_PUBLISHED_MONTH);
    }
  });

  it("UI-SUP-014 AC2 renders the period header, the shared period card and the four totals with the response's figures", () => {
    const figures = derivedSupplyFigures(supplyWith(), { period: AUGUST_2026 });
    render(supplyWith(), published(figures));

    const region = summary();
    expect(within(region).getByRole("heading", { name: "Datos de agosto de 2026" })).toBeInTheDocument();
    expect(region).toHaveTextContent("lo más reciente que puedes ver es agosto de 2026");
    expect(within(region).getByRole("region", { name: "De la energía que te tocó" })).toBeInTheDocument();
    const totals = within(within(region).getByRole("list", { name: "Totales del periodo" })).getAllByRole("listitem");
    expect(totals.map((tile) => tile.textContent)).toEqual([
      expect.stringContaining(formatKilowattHours(figures.energy.selfConsumptionKWh)),
      expect.stringContaining(formatKilowattHours(figures.energy.gridImportKWh)),
      expect.stringContaining(formatKilowattHours(figures.energy.surplusKWh)),
      expect.stringContaining(formatEuros(figures.savings.amountEur!)),
    ]);
    // The shared totals' words, the same as on the historical analysis page.
    expect(totals[1]).toHaveTextContent("Lo que te vendrá en la factura");
  });

  it("UI-SUP-014 AC3 with no published month, says so in a neutral notice, with no figures", () => {
    render(supplyWith(), published(derivedSupplyFigures(supplyWith(), { period: NOTHING_PUBLISHED })));

    const region = summary();
    expect(within(region).getByRole("note")).toHaveTextContent("Todavía no hay datos publicados de este punto.");
    expect(within(region).queryByRole("list", { name: "Totales del periodo" })).not.toBeInTheDocument();
    expect(within(region).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UI-SUP-014 AC3 a failed request is a load error with Reintentar, which asks again", async () => {
    const failed = query.error(apiError(500));
    render(supplyWith(), failed as Metrics);

    const alert = within(summary()).getByRole("alert");
    expect(alert).toHaveTextContent("No se pudieron cargar los datos de energía de este punto.");
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalledTimes(1);
  });

  it("UI-SUP-014 AC3 while the request is pending, a placeholder stands in for the figures", () => {
    render(supplyWith(), query.loading());

    expect(within(summary()).getByRole("progressbar", { name: "Cargando los datos del punto…" })).toBeInTheDocument();
  });

  it("UI-SUP-014 AC3 a plant's own supply shows the card's not-applicable state and the plant notice", () => {
    const plantSupply = supplyWith({ plant: { id: "plant-1", name: "Planta Polideportivo" } });
    render(plantSupply, published(derivedSupplyFigures(plantSupply, { period: AUGUST_2026, selfConsumptionRatioStatus: "NOT_APPLICABLE" })));

    const region = summary();
    expect(region).toHaveTextContent("No aplica al punto de la planta");
    expect(within(region).getAllByRole("note").map((note) => note.textContent)).toContain(
      plantSupplyNotice("Casa de Lucía", "Planta Polideportivo"),
    );
    expect(region).toHaveTextContent("Siempre 0 en el punto de la planta");
  });

  it("UI-SUP-014 asks for nothing when the supply does not open its figures to the caller", () => {
    render(supplyWith({}, {}), query.loading());

    expect(enabledMetricsCalls()).toHaveLength(0);
    expect(within(summary()).queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

describe("UI-SUP-015 Ver análisis completo is offered to whoever may read the supply's figures (#252)", () => {
  const figures = () => published(derivedSupplyFigures(supplyWith(), { period: AUGUST_2026 }));
  const link = () => screen.queryByRole("link", { name: FULL_ANALYSIS });

  it("UI-SUP-015 AC5 links the owner to the historical analysis with the supply preselected", () => {
    render(supplyWith({ user: { id: "owner-1" } }, { canRead: true }), figures());

    expect(link()).toHaveAttribute("href", `/historical-analysis?supplyId=${SUPPLY_ID}`);
  });

  it("UI-SUP-015 AC5 offers it to a community admin on another member's supply, which the supply opens to them", () => {
    render(supplyWith({ user: { id: "another-member" } }, { canRead: true, canEdit: true, canDelete: true }), figures());

    expect(link()).toHaveAttribute("href", `/historical-analysis?supplyId=${SUPPLY_ID}`);
  });

  it("UI-SUP-015 AC5 does not offer it when the supply withholds canRead, as for a member who does not own it", () => {
    render(supplyWith({ user: { id: "another-member" } }, {}), figures());

    expect(summary()).toBeInTheDocument();
    expect(link()).not.toBeInTheDocument();
  });

  it("UI-SUP-015 AC5 does not offer it to a platform admin the supply grants nothing", () => {
    render(supplyWith({ user: { id: "another-member" } }, { canEdit: false, canDelete: false, canRead: false }), figures());

    expect(link()).not.toBeInTheDocument();
  });
});

describe("UI-SUP-012 the detail header tags a plant's own supply (#252)", () => {
  const plantSupply = () => supplyWith({ plant: { id: "plant-1", name: "Planta Polideportivo" } });
  const figures = () => published(derivedSupplyFigures(plantSupply(), { period: AUGUST_2026 }));

  it("UI-SUP-012 AC4 links the Punto de planta tag to its plant when the active community lets the caller open plants", () => {
    render(plantSupply(), figures(), { communityCanRead: true });

    expect(screen.getByRole("link", { name: "Punto de planta: ver la planta Planta Polideportivo" })).toHaveAttribute(
      "href",
      "/plants/plant-1",
    );
  });

  it("UI-SUP-012 AC4 shows the tag as plain text when the active community does not", () => {
    render(plantSupply(), figures(), { communityCanRead: false });

    expect(screen.queryByRole("link", { name: /^Punto de planta/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("Punto de planta").length).toBeGreaterThan(0);
  });

  it("UI-SUP-012 AC4 does not tag a supply without a plant reference, whatever its name", () => {
    render(supplyWith({ name: "Punto de planta", plant: null }), figures(), { communityCanRead: true });

    expect(screen.queryByRole("link", { name: /^Punto de planta/ })).not.toBeInTheDocument();
    // Structural: the tag is a Chip with no role, and the supply's own name is the same text.
    expect(screen.queryByText("Punto de planta", { selector: ".MuiChip-label" })).not.toBeInTheDocument();
  });
});
