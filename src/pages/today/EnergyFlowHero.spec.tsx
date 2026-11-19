import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import { colors } from "../../theme/tokens";
import { EnergyFlowHero, type EnergyFlowHeroProps } from "./EnergyFlowHero";

function renderHero(props: Partial<EnergyFlowHeroProps> = {}) {
  renderWithProviders(
    <EnergyFlowHero mode="flowing" powerKW={0.48} plantPowerKW={12.5} supplyLabel="Casa" {...props} />,
  );
  return screen.getByTestId("energy-flow-hero");
}
const conduit = (hero: HTMLElement) => within(hero).getByTestId("conduit");
const chevrons = (hero: HTMLElement) => within(hero).queryAllByTestId("chevron");

describe("EnergyFlowHero", () => {
  it("UI-TDY-006 draws a solid conduit as thick as the absolute scale says for the power", () => {
    const hero = renderHero({ powerKW: 1 });

    expect(conduit(hero)).toHaveAttribute("data-style", "solid");
    const line = conduit(hero).querySelector("line")!;
    expect(Number(line.getAttribute("stroke-width"))).toBeCloseTo(3 + 3.2 * Math.log2(5), 10);
    expect(line).toHaveAttribute("stroke", ENERGY_COLORS.assigned);
  });

  it("UI-TDY-006 draws white chevrons from 7 px of thickness, and none below", () => {
    // 0.25 kW is 6.2 px; 0.5 kW is 3 + 3.2·log₂(3) ≈ 8.07 px.
    expect(chevrons(renderHero({ powerKW: 0.25 }))).toHaveLength(0);
    cleanup();
    const thick = chevrons(renderHero({ powerKW: 0.5 }));
    expect(thick.length).toBeGreaterThan(1);
    thick.forEach((chevron) => expect(chevron).toHaveAttribute("stroke", colors.background.paper));
  });

  it("UI-TDY-006 draws a thin dashed conduit in the inactive border colour when nothing flows", () => {
    for (const props of [
      { mode: "idle", powerKW: 0 },
      { mode: "idle", powerKW: null },
      { mode: "waiting", powerKW: null },
      { mode: "unavailable", powerKW: null },
    ] as const) {
      cleanup();
      const hero = renderHero({ ...props, plantPowerKW: null });
      const line = conduit(hero).querySelector("line")!;
      expect(conduit(hero)).toHaveAttribute("data-style", "dashed");
      expect(line).toHaveAttribute("stroke", colors.border.inactive);
      expect(line).toHaveAttribute("stroke-width", "2");
      expect(line).toHaveAttribute("stroke-dasharray", "4 6");
      expect(conduit(hero).querySelector("polygon")).toHaveAttribute("fill", colors.border.inactive);
      expect(chevrons(hero)).toHaveLength(0);
    }
  });

  it("UI-TDY-006 greys the plant node when the plant sends no data", () => {
    const hero = renderHero({ mode: "unavailable", powerKW: null, plantPowerKW: null });

    expect(within(hero).getByTestId("plant-node")).toHaveAttribute("fill", colors.background.surface);
    expect(within(hero).getByTestId("plant-node")).toHaveAttribute("stroke", colors.border.light);
  });

  it("UI-TDY-005 names the plant node for the community's production, with its power only while there is one", () => {
    const flowing = renderHero({ plantPowerKW: 12.5 });
    expect(within(flowing).getByText("Producción de la comunidad")).toBeInTheDocument();
    expect(within(flowing).getByText("12,5 kW")).toBeInTheDocument();

    cleanup();
    const waiting = renderHero({ mode: "waiting", powerKW: null, plantPowerKW: 12.5 });
    expect(within(waiting).getByText("Producción de la comunidad")).toBeInTheDocument();
    expect(within(waiting).queryByText("12,5 kW")).not.toBeInTheDocument();
  });

  it("UI-TDY-004 is illustrative only: hidden from assistive technology, whose words are the status sentence's", () => {
    const hero = renderHero();

    expect(hero).toHaveAttribute("aria-hidden", "true");
    expect(within(hero).getByText("0,48 kW")).toBeInTheDocument();
    expect(within(hero).getByText("te llegan ahora")).toBeInTheDocument();
  });
});
