import type { FC } from "react";
import Chart from "react-apexcharts";
import { ChartScrollArea } from "./ChartScrollArea";
import type { ConsumptionSeriesView } from "./consumptionSeries";
import { energyChartOptions, savingsChartOptions } from "./evolutionChartOptions";

/** Draws the energy chart exactly as the view says: its series (null is a gap), markers and words. */
export const EnergyEvolutionChart: FC<{ view: ConsumptionSeriesView; isPlantSupply: boolean }> = ({ view, isPlantSupply }) => (
  <ChartScrollArea minWidth={view.minChartWidth}>
    <Chart type="bar" height={240} width="100%" options={energyChartOptions(view, isPlantSupply)} series={view.energySeries} />
  </ChartScrollArea>
);

/** Draws the savings chart exactly as the view says. */
export const SavingsEvolutionChart: FC<{ view: ConsumptionSeriesView; isPlantSupply: boolean }> = ({ view, isPlantSupply }) => (
  <ChartScrollArea minWidth={view.minChartWidth}>
    <Chart type="bar" height={160} width="100%" options={savingsChartOptions(view, isPlantSupply)} series={view.savingsSeries} />
  </ChartScrollArea>
);
