import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { formatEuros } from "../../utils/formatEnergyFigures";
import { CommunityFigures } from "./CommunityFigures";
import { SEPTEMBER_2026, communityMetrics, plain } from "./communityAnalysis.testData";

const card = () => screen.getByRole("region", { name: "En cifras" });
const UNPRICED = /no tienen precio de mercado/;

describe("UI-CAN-005 the income is a market-price estimate (#403)", () => {
  it("UI-CAN-005 shows a negative estimate with its label and the negative-price help (AC7)", () => {
    renderWithProviders(<CommunityFigures metrics={communityMetrics(SEPTEMBER_2026, { surplusIncome: { amountEur: -3.2, unpricedSurplusKWh: 0 } })} />);

    expect(within(card()).getByText(plain(formatEuros(-3.2)))).toBeInTheDocument();
    expect(plain(formatEuros(-3.2))).toBe("-3,20 €");
    expect(within(card()).getByText("Estimación · precio del mercado eléctrico")).toBeInTheDocument();
    expect(within(card()).getByText("El mercado eléctrico puede tener precios negativos, así que el ingreso estimado puede ser negativo.")).toBeInTheDocument();
  });

  it("UI-CAN-005 reads a null income as 'Sin datos'", () => {
    renderWithProviders(<CommunityFigures metrics={communityMetrics(SEPTEMBER_2026, { surplusIncome: { amountEur: null, unpricedSurplusKWh: null } })} />);

    expect(within(card()).getByText("Ingreso estimado por la energía que se fue a la red").parentElement).toHaveTextContent("Sin datos");
    expect(within(card()).queryByText(UNPRICED)).not.toBeInTheDocument();
  });

  it("UI-CAN-005 states the unpriced exported energy when there is some (AC8)", () => {
    renderWithProviders(<CommunityFigures metrics={communityMetrics(SEPTEMBER_2026, { surplusIncome: { amountEur: 120.5, unpricedSurplusKWh: 1.5 } })} />);

    expect(within(card()).getByRole("note")).toHaveTextContent(
      "1,5 kWh de energía que se fue a la red no tienen precio de mercado y no cuentan en el ingreso.",
    );
  });

  it("UI-CAN-005 says nothing about unpriced energy when every hour was priced (AC8)", () => {
    renderWithProviders(<CommunityFigures metrics={communityMetrics(SEPTEMBER_2026, { surplusIncome: { amountEur: 120.5, unpricedSurplusKWh: 0 } })} />);

    expect(within(card()).queryByText(UNPRICED)).not.toBeInTheDocument();
    expect(within(card()).queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("UI-CAN-006 the CO₂ avoided names its factor (#403)", () => {
  const co2 = () => within(card()).getByText("CO₂ evitado").parentElement!;

  it("UI-CAN-006 writes 1.234,5 kg as tonnes and names both factor years (AC9)", () => {
    renderWithProviders(<CommunityFigures metrics={communityMetrics(SEPTEMBER_2026, { co2Avoided: { amountKg: 1234.5, factorYears: [2024, 2025] } })} />);

    expect(co2()).toHaveTextContent("1,2 t");
    expect(co2()).toHaveTextContent("MITECO para la electricidad sin garantía de origen de 2024 y 2025.");
  });

  it("UI-CAN-006 writes a mass below a tonne in kilograms (AC9)", () => {
    renderWithProviders(<CommunityFigures metrics={communityMetrics(SEPTEMBER_2026, { co2Avoided: { amountKg: 850, factorYears: [2025] } })} />);

    expect(co2()).toHaveTextContent("850 kg");
  });

  it("UI-CAN-006 reads a null CO₂ as 'Sin datos', with no factor note (AC9)", () => {
    renderWithProviders(<CommunityFigures metrics={communityMetrics(SEPTEMBER_2026, { co2Avoided: { amountKg: null, factorYears: null } })} />);

    expect(co2()).toHaveTextContent("Sin datos");
    expect(co2()).not.toHaveTextContent("MITECO");
  });
});

describe("UI-CAN-003 the installed power is the response's (#403)", () => {
  it("UI-CAN-003 writes it in kWp", () => {
    renderWithProviders(<CommunityFigures metrics={communityMetrics(SEPTEMBER_2026, { installedPowerKWp: 112.5 })} />);

    expect(within(card()).getByText("Potencia instalada").parentElement).toHaveTextContent("112,5 kWp");
  });
});
