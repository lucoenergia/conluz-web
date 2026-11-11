import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ApexOptions } from "apexcharts";
import { renderWithProviders } from "../../test/renderWithProviders";
import { colors } from "../../theme/tokens";
import type { HistoricalPeriod } from "../period/historicalPeriod";
import { Evolution } from "./Evolution";
import { hoursSignal, toEvolutionView, type EvolutionCopy, type SeriesDefinition } from "./evolutionSeries";

const { Chart } = vi.hoisted(() => ({ Chart: vi.fn<(props: { series: { name: string }[]; options: ApexOptions }) => null>(() => null) }));
// ApexCharts cannot lay out in jsdom: the stub records each chart drawn.
vi.mock("react-apexcharts", () => ({ default: Chart }));

const JULY_1_TO_3: HistoricalPeriod = {
  startDate: "2026-07-01T00:00:00+02:00",
  endDate: "2026-07-04T00:00:00+02:00",
  granularity: "daily",
  label: "Del 1 al 3 de julio de 2026",
};

/** A plant's day, synthetic: one segment and the hours it adds up. */
interface PlantDay {
  date: string;
  productionKWh: number;
  savingsEur: number;
  hoursWithData: number;
  expectedHours: number;
}

const WITHOUT_SAVINGS: SeriesDefinition<PlantDay, "production"> = {
  segments: [{ key: "production", label: "Producción", color: colors.text.primary, group: "production" }],
  read: (bucket) => ({ timeKey: bucket.date, values: { production: bucket.productionKWh } }),
  signal: hoursSignal,
};

const WITH_SAVINGS: SeriesDefinition<PlantDay, "production"> = {
  ...WITHOUT_SAVINGS,
  savings: { label: "Ahorro", color: colors.text.secondary, read: (bucket) => bucket.savingsEur, isZero: (bucket) => bucket.savingsEur === 0 },
};

const COPY: EvolutionCopy = {
  title: { hourly: "Producción hora a hora", daily: "Producción día a día", monthly: "Producción mes a mes" },
  legendGroups: [{ heading: "Producción", segments: ["production"] }],
  caption: { wide: "La barra es la producción.", narrow: "La barra es la producción." },
  rowHeader: "Producción",
  rowsLabel: (unit) => `Producción por ${unit}`,
  savingsRowsLabel: (unit) => `Ahorro por ${unit}`,
  stateText: (state) => state.kind,
  partialNotice: ({ where }) => `En ${where} faltan horas.`,
};

const DAYS: PlantDay[] = ["2026/07/01", "2026/07/02", "2026/07/03"].map((date) => ({
  date,
  productionKWh: 12.5,
  savingsEur: 1.5,
  hoursWithData: 24,
  expectedHours: 24,
}));

/** Stands for a price label that asks for its price: it counts its mounts. */
const PriceProbe = vi.fn(() => <span>Precio estimado</span>);

function renderEvolution(definition: SeriesDefinition<PlantDay, "production">) {
  renderWithProviders(
    <Evolution
      view={toEvolutionView(JULY_1_TO_3, definition, DAYS, COPY)}
      look={definition}
      copy={COPY}
      extraLines={[]}
      priceLabel={<PriceProbe />}
    />,
  );
}

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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UI-HIS-015 a series without savings has no savings chart, legend or price (#401)", () => {
  it("UI-HIS-015 AC10 -- from sm up, only the energy chart is drawn, no savings legend, and the price label never mounts", () => {
    wideScreen();
    renderEvolution(WITHOUT_SAVINGS);

    expect(Chart.mock.calls.map(([props]) => props.series.map(({ name }) => name))).toEqual([["Producción"]]);
    expect(screen.queryByText("Ahorro")).not.toBeInTheDocument();
    expect(PriceProbe).not.toHaveBeenCalled();
  });

  it("UI-HIS-015 AC10 -- below sm, no savings rows are listed, and the price label never mounts", () => {
    renderEvolution(WITHOUT_SAVINGS);

    expect(screen.getByRole("list", { name: "Producción por día" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Ahorro por día" })).not.toBeInTheDocument();
    expect(PriceProbe).not.toHaveBeenCalled();
  });

  it("UI-HIS-015 a series with savings draws them, with their legend and price", () => {
    wideScreen();
    renderEvolution(WITH_SAVINGS);

    expect(Chart.mock.calls.map(([props]) => props.series.map(({ name }) => name))).toEqual([["Producción"], ["Ahorro"]]);
    expect(screen.getByText("Ahorro")).toBeInTheDocument();
    expect(screen.getByText("Precio estimado")).toBeInTheDocument();
  });
});
