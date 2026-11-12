import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import type { CommunityPlantEnergyResponse } from "../../api/models";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CommunityFigures } from "./CommunityFigures";
import { CommunityHeader } from "./CommunityHeader";
import { CommunityPlants } from "./CommunityPlants";
import { SEPTEMBER_2026, communityMetrics } from "./communityAnalysis.testData";

// Two plants whose powers differ from each other's, and whose own peak and
// nominal differ, so a row showing another plant's figure, or one power for
// the other, fails. The community total is not their sum on purpose: the page
// shows the response's figure, never one it adds up (UI-CAN-003).
const LUCO: CommunityPlantEnergyResponse = {
  plant: { id: "plant-luco", name: "Planta Luco" },
  peakPowerKWp: 80,
  nominalPowerKW: 60,
  productionKWh: 900,
  productionShare: 0.6,
};
const ESCUELAS: CommunityPlantEnergyResponse = {
  plant: { id: "plant-escuelas", name: "Planta Escuelas" },
  peakPowerKWp: 25.5,
  nominalPowerKW: 20.25,
  productionKWh: 600,
  productionShare: 0.4,
};
const METRICS = communityMetrics(SEPTEMBER_2026, { peakPowerKWp: 100, nominalPowerKW: 80, plants: [LUCO, ESCUELAS] });

/** The page's three places that show a plant power, as it composes them. */
function renderPowers() {
  return renderWithProviders(
    <>
      <CommunityHeader metrics={METRICS} />
      <CommunityFigures metrics={METRICS} />
      <CommunityPlants plants={METRICS.plants} />
    </>,
  );
}

const figures = () => screen.getByRole("region", { name: "En cifras" });
const rows = () => within(screen.getByRole("list", { name: "Plantas de la comunidad" })).getAllByRole("listitem");

describe("UI-CAN-010 the community's peak and nominal power (#407)", () => {
  it("UI-CAN-010 the figures show «Potencia pico» 100 kWp and «Potencia nominal» 80 kW from the response", () => {
    renderPowers();

    expect(within(figures()).getByText("Potencia pico").parentElement).toHaveTextContent("100 kWp");
    expect(within(figures()).getByText("Potencia nominal").parentElement).toHaveTextContent(/80 kW(?!p)/);
  });

  it("UI-CAN-010 the header line under the title states both powers", () => {
    renderPowers();

    expect(screen.getByText("2 plantas · Potencia pico 100 kWp · Potencia nominal 80 kW", { exact: false })).toBeInTheDocument();
  });

  it("UI-CAN-010 labels no figure with the forbidden word for installed power", () => {
    const { container } = renderPowers();

    expect(container).not.toHaveTextContent(/instalad/i);
  });
});

describe("UI-CAN-008 each plant row shows its own peak and nominal power (#407)", () => {
  it("UI-CAN-008 shows each plant's peak power in kWp and nominal power in kW, from its own entry", () => {
    renderWithProviders(<CommunityPlants plants={[LUCO, ESCUELAS]} />);

    const [luco, escuelas] = rows();
    expect(luco).toHaveTextContent("Potencia pico 80 kWp · Potencia nominal 60 kW");
    expect(escuelas).toHaveTextContent("Potencia pico 25,5 kWp · Potencia nominal 20,25 kW");
    expect(luco).not.toHaveTextContent("25,5");
  });
});
