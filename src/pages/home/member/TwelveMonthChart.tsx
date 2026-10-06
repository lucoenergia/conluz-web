import type { FC } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Box } from "@mui/material";
import { formatEuros, formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { colors, shadows } from "../../../theme/tokens";
import type { MonthlySeriesView, MonthView } from "./monthlySeries";

/** Wide enough for twelve labelled columns: narrower screens scroll the chart, never squeeze its axis. */
const MIN_CHART_WIDTH = 576;

function tooltipRow(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;"><span style="color:${colors.text.secondary};">${label}</span><span style="font-weight:600;color:${colors.text.primary};">${value}</span></div>`;
}

function tooltip(month: MonthView, rows: [string, string][]): string {
  const incomplete = month.incompleteText
    ? `<div style="font-size:12px;color:${colors.text.body};margin-top:4px;">${month.incompleteText}</div>`
    : "";
  return `<div style="padding:8px 12px;background:${colors.background.paper};box-shadow:${shadows.dropdown};"><div style="font-weight:600;margin-bottom:4px;color:${colors.text.primary};">${month.name}</div>${rows
    .map(([label, value]) => tooltipRow(label, value))
    .join("")}${incomplete}</div>`;
}

function baseOptions(view: MonthlySeriesView, annotations: ApexOptions["annotations"]): ApexOptions {
  return {
    chart: { toolbar: { show: false }, animations: { enabled: false }, background: "transparent", zoom: { enabled: false } },
    annotations,
    dataLabels: { enabled: false },
    grid: { borderColor: colors.border.light, strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: view.categories,
      labels: { style: { colors: colors.text.secondary, fontSize: "12px" }, rotate: 0, hideOverlappingLabels: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    legend: { position: "top", horizontalAlign: "left", fontSize: "12px", labels: { colors: colors.text.body } },
    states: { hover: { filter: { type: "darken" } } },
  };
}

/**
 * Draws the twelve-month view exactly as given: its series (null is a gap),
 * its annotations and its words. Computes nothing, so what it is told to draw
 * is what the table beside it says.
 */
export const TwelveMonthChart: FC<{ view: MonthlySeriesView }> = ({ view }) => {
  const energyOptions: ApexOptions = {
    ...baseOptions(view, view.energyAnnotations),
    chart: { ...baseOptions(view, view.energyAnnotations).chart, stacked: true },
    colors: [colors.success.vivid, colors.accent.blue],
    plotOptions: { bar: { columnWidth: "60%", borderRadius: 4, borderRadiusApplication: "end", borderRadiusWhenStacked: "last" } },
    stroke: { show: true, width: 2, colors: [colors.background.paper] },
    yaxis: { labels: { style: { colors: colors.text.secondary }, formatter: formatKilowattHours } },
    tooltip: {
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const month = view.months[dataPointIndex];
        return tooltip(month, [
          [view.energySeries[0].name, month.selfConsumptionText],
          [view.energySeries[1].name, month.gridImportText],
        ]);
      },
    },
  };
  const savingsOptions: ApexOptions = {
    ...baseOptions(view, view.savingsAnnotations),
    colors: [colors.success.main],
    plotOptions: { bar: { columnWidth: "40%", borderRadius: 4, borderRadiusApplication: "end" } },
    yaxis: { labels: { style: { colors: colors.text.secondary }, formatter: formatEuros } },
    tooltip: {
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const month = view.months[dataPointIndex];
        return tooltip(month, [[view.savingsSeries[0].name, month.savingsText]]);
      },
    },
  };

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box sx={{ minWidth: MIN_CHART_WIDTH }}>
        <Chart type="bar" height={260} width="100%" options={energyOptions} series={view.energySeries} />
        <Chart type="bar" height={180} width="100%" options={savingsOptions} series={view.savingsSeries} />
      </Box>
    </Box>
  );
};
