import type { FC } from "react";
import Chart from "react-apexcharts";
import { ChartScrollArea } from "./ChartScrollArea";
import { energyChartOptions, savingsChartOptions } from "./evolutionChartOptions";
import type { EvolutionView, SeriesLook } from "./evolutionSeries";

interface EvolutionChartProps {
  view: EvolutionView<string>;
  look: SeriesLook<string>;
  /** The page's own lines about the scope, in every tooltip. */
  extraLines: readonly string[];
}

/** Draws the energy chart exactly as the view says: its series (null is a gap), markers and words. */
export const EnergyEvolutionChart: FC<EvolutionChartProps> = ({ view, look, extraLines }) => (
  <ChartScrollArea minWidth={view.minChartWidth}>
    <Chart type="bar" height={240} width="100%" options={energyChartOptions(view, look, extraLines)} series={view.energySeries} />
  </ChartScrollArea>
);

/** Draws the savings chart exactly as the view says, for a series that has savings. */
export const SavingsEvolutionChart: FC<EvolutionChartProps & { savings: NonNullable<SeriesLook<string>["savings"]> }> = ({
  view,
  look,
  savings,
  extraLines,
}) => (
  <ChartScrollArea minWidth={view.minChartWidth}>
    <Chart type="bar" height={160} width="100%" options={savingsChartOptions(view, look, savings, extraLines)} series={view.savingsSeries} />
  </ChartScrollArea>
);
