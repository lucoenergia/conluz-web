import type { FC } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { formatAverageKilowattHours } from "../../../utils/formatEnergyFigures";
import { colors, shadows } from "../../../theme/tokens";
import { ChartScrollArea } from "./ChartScrollArea";
import type { HourlyProfileView } from "./hourlyProfile";

/** Wide enough for 24 labelled pairs of bars: narrower screens scroll the chart, never squeeze its axis. */
const MIN_CHART_WIDTH = 672;

type Profile = Extract<HourlyProfileView, { kind: "profile" }>;

function tooltipRow(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;"><span style="color:${colors.text.secondary};">${label}</span><span style="font-weight:600;color:${colors.text.primary};">${value}</span></div>`;
}

/**
 * Draws the hourly view exactly as given: its two series (null is a gap), its
 * baseline markers and its words. Computes nothing, so what it is told to draw
 * is what the table beside it says. Consumption is drawn hollow, in its own
 * colour, and assigned energy solid; the legend is the block's, not the chart's.
 */
export const BestHoursChart: FC<{ view: Profile }> = ({ view }) => {
  const [consumptionColor, assignedColor] = view.colors;
  const options: ApexOptions = {
    chart: { toolbar: { show: false }, animations: { enabled: false }, background: "transparent", zoom: { enabled: false } },
    annotations: view.annotations,
    colors: view.colors,
    fill: { colors: [colors.background.paper, assignedColor], opacity: 1 },
    dataLabels: { enabled: false },
    plotOptions: { bar: { columnWidth: "70%", borderRadius: 3, borderRadiusApplication: "end" } },
    stroke: { show: true, width: 2, colors: [consumptionColor, colors.background.paper] },
    grid: {
      borderColor: colors.border.light,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      column: { colors: view.columnColors, opacity: 1 },
    },
    xaxis: {
      categories: view.categories,
      labels: { style: { colors: colors.text.secondary, fontSize: "11px" }, rotate: 0, hideOverlappingLabels: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: colors.text.secondary }, formatter: formatAverageKilowattHours } },
    legend: { show: false },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const hour = view.hours[dataPointIndex];
        return `<div style="padding:8px 12px;background:${colors.background.paper};box-shadow:${shadows.dropdown};"><div style="font-weight:600;margin-bottom:4px;color:${colors.text.primary};">${hour.label}</div>${tooltipRow(view.series[0].name, hour.consumptionText)}${tooltipRow(view.series[1].name, hour.productionText)}</div>`;
      },
    },
  };

  return (
    <ChartScrollArea minWidth={MIN_CHART_WIDTH}>
      <Chart type="bar" height={260} width="100%" options={options} series={view.series} />
    </ChartScrollArea>
  );
};
