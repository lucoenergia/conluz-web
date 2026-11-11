import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { declaredStyle } from "../../test/declaredStyle";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import { colors } from "../../theme/tokens";
import { formatKilowattHours } from "../../utils/formatEnergyFigures";
import { CommunityPlants } from "./CommunityPlants";
import { sharePercent } from "./communityFigureTexts";
import { ESCUELAS, PABELLON, plain } from "./communityAnalysis.testData";

const rows = () => within(screen.getByRole("list", { name: "Plantas de la comunidad" })).getAllByRole("listitem");

describe("UI-CAN-008 the plant rows (#403)", () => {
  it("UI-CAN-008 shows each plant's name, installed power, production and share, all from the response (AC12)", () => {
    renderWithProviders(<CommunityPlants plants={[PABELLON, ESCUELAS]} />);

    const [pabellon, escuelas] = rows();
    expect(pabellon).toHaveTextContent(plain(`Planta Pabellón60 kWp${formatKilowattHours(7776.5)}${sharePercent(0.5333)} del total`));
    expect(escuelas).toHaveTextContent(plain(`Planta Escuelas37,5 kWp${formatKilowattHours(4861.9)}${sharePercent(0.3334)} del total`));
  });

  it("UI-CAN-008 reads a plant without production as 'Sin datos en este periodo', never 0 (AC12)", () => {
    renderWithProviders(<CommunityPlants plants={[PABELLON, { ...ESCUELAS, productionKWh: null, productionShare: null }]} />);

    const [, escuelas] = rows();
    expect(escuelas).toHaveTextContent("Sin datos en este periodo");
    expect(escuelas).not.toHaveTextContent("0 kWh");
    expect(escuelas).not.toHaveTextContent("del total");
  });

  it("UI-CAN-008 rows are not links", () => {
    renderWithProviders(<CommunityPlants plants={[PABELLON, ESCUELAS]} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("UI-CAN-008 a community without plants gets a neutral empty state (AC13)", () => {
    renderWithProviders(<CommunityPlants plants={[]} />);

    const region = screen.getByRole("region", { name: "Plantas" });
    expect(within(region).getByRole("note")).toHaveTextContent("Esta comunidad todavía no tiene plantas");
    expect(within(region).queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("UI-CAN-009 the plant rows' colours (#403)", () => {
  it("UI-CAN-009 draws the share bar in gold on a background.default track, and no text in gold", () => {
    renderWithProviders(<CommunityPlants plants={[PABELLON, ESCUELAS]} />);

    for (const row of rows()) {
      // The share bar is decorative, with no role or name: its track is the row's one aria-hidden box.
      const track = row.querySelector("[aria-hidden]")!;
      expect(declaredStyle(track)["background-color"]).toBe(colors.background.default);
      expect(declaredStyle(track.firstElementChild!)["background-color"]).toBe(ENERGY_COLORS.assigned);
      for (const element of row.querySelectorAll("*")) expect(declaredStyle(element).color).not.toBe(colors.marks.gold);
    }
  });
});
