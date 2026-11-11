import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { declaredStyle } from "../../test/declaredStyle";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import { colors } from "../../theme/tokens";
import { formatKilowattHours } from "../../utils/formatEnergyFigures";
import { CommunityJourney } from "./CommunityJourney";
import { wholePercent } from "./communityFigureTexts";
import { SEPTEMBER_2026, communityMetrics, plain } from "./communityAnalysis.testData";

const card = () => screen.getByRole("region", { name: "El recorrido de la energía de la comunidad" });
const splitRows = () => within(screen.getByRole("list", { name: "Adónde fue la energía" })).getAllByRole("listitem");
/** A legend row's swatch: the one decorative box in it, which has no role or name to find it by. */
const swatchOf = (row: HTMLElement) => row.querySelector("[aria-hidden]")!;

describe("UI-CAN-003 the journey shows the response's own figures (#403)", () => {
  it("UI-CAN-003 leads with the production, and splits it with the server's ratios, never recomputed", () => {
    // 100 and 300 kWh would be 25 % and 75 %: the ratios shown are the server's.
    renderWithProviders(
      <CommunityJourney
        metrics={communityMetrics(SEPTEMBER_2026, {
          energy: { productionKWh: 412.35, selfConsumptionKWh: 100, surplusKWh: 300 },
          selfConsumptionRatio: 0.6,
          surplusRatio: 0.4,
        })}
      />,
    );

    expect(within(card()).getByText(formatKilowattHours(412.35))).toBeInTheDocument();
    const [used, exported] = splitRows();
    expect(used).toHaveTextContent(plain(`Se usó en la comunidad${formatKilowattHours(100)}${wholePercent(0.6)}`));
    expect(exported).toHaveTextContent(plain(`Se fue a la red${formatKilowattHours(300)}${wholePercent(0.4)}`));
    expect(card()).not.toHaveTextContent(plain(wholePercent(0.25)));
    expect(screen.getByRole("img", { name: `${wholePercent(0.6)} se usó en la comunidad y ${wholePercent(0.4)} se fue a la red` })).toBeInTheDocument();
  });

  it("UI-CAN-003 reads a null figure as 'Sin datos', and shows no split without the ratios", () => {
    renderWithProviders(
      <CommunityJourney
        metrics={communityMetrics(SEPTEMBER_2026, {
          energy: { productionKWh: null, selfConsumptionKWh: null, surplusKWh: null },
          selfConsumptionRatio: null,
          surplusRatio: null,
        })}
      />,
    );

    expect(within(card()).getAllByText("Sin datos")).toHaveLength(3);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("UI-CAN-009 the journey's colours (#403)", () => {
  it("UI-CAN-009 keys the split's legend to community and exported, with no gold in it", () => {
    renderWithProviders(<CommunityJourney metrics={communityMetrics(SEPTEMBER_2026)} />);

    const swatches = splitRows().map((row) => declaredStyle(swatchOf(row))["background-color"]);
    expect(swatches).toEqual([ENERGY_COLORS.community, ENERGY_COLORS.exported]);
    expect(swatches).not.toContain(colors.marks.gold);
  });

  it("UI-CAN-009 draws the split bar in community and exported only", () => {
    renderWithProviders(<CommunityJourney metrics={communityMetrics(SEPTEMBER_2026)} />);

    const segments = [...screen.getByRole("img").children].map((segment) => declaredStyle(segment)["background-color"]);
    expect(segments).toEqual([ENERGY_COLORS.community, ENERGY_COLORS.exported]);
  });

  it("UI-CAN-009 sets the production in text.primary beside a gold swatch, never in gold type", () => {
    renderWithProviders(<CommunityJourney metrics={communityMetrics(SEPTEMBER_2026, { energy: { productionKWh: 14582.6, selfConsumptionKWh: 1, surplusKWh: 1 } })} />);

    const figure = within(card()).getByText(formatKilowattHours(14582.6));
    expect(declaredStyle(figure).color).toBe(colors.text.primary);
    const label = within(card()).getByText("Las plantas produjeron");
    expect(declaredStyle(swatchOf(label.parentElement!))["background-color"]).toBe(ENERGY_COLORS.assigned);
    for (const element of card().querySelectorAll("*")) expect(declaredStyle(element).color).not.toBe(colors.marks.gold);
  });
});
