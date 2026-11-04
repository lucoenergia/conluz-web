import type { ApexOptions } from "apexcharts";
import { formatEuros, formatKilowattHours } from "../../utils/formatEnergyFigures";
import { colors, shadows } from "../../theme/tokens";
import { ENERGY_COLORS, SAVINGS_COLOR } from "../../components/EnergyFigures/energyColors";
import {
  GRID_IMPORT_SERIES,
  SAVINGS_SERIES,
  SELF_CONSUMPTION_SERIES,
  SURPLUS_SERIES,
  TECHNICAL_TERM,
  type ConsumptionSeriesView,
  type SlotView,
} from "./consumptionSeries";

// The options and tooltip of the evolution charts (#250), apart from the
// components so a spec can build them without rendering ApexCharts.

export const PLANT_TOOLTIP_TEXT = "En el punto de la planta, «se fue a la red» siempre es 0 kWh.";

/** A home term, and the technical term it carries muted after it (UI-HIS-027). */
function pairedTermHtml(term: string): string {
  const technical = TECHNICAL_TERM[term];
  return technical ? `${term} <span style="color:${colors.text.secondary};">· ${technical}</span>` : term;
}

function tooltipRow(label: string, swatch: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;"><span style="display:flex;align-items:center;gap:6px;color:${colors.text.body};"><span style="flex:none;width:8px;height:8px;border-radius:2px;background:${swatch};"></span><span>${pairedTermHtml(label)}</span></span><span style="font-weight:600;color:${colors.text.primary};white-space:nowrap;">${value}</span></div>`;
}

/**
 * A slot in words: its date, its state, its figures when it has any, and the
 * plant line when the selected supply is a plant's own. Both charts show the
 * same tooltip, so a reader gets every figure of the slot from either.
 */
export function slotTooltip(slot: SlotView, isPlantSupply: boolean): string {
  const line = (text: string) => `<div style="font-size:12px;color:${colors.text.body};margin-bottom:4px;">${text}</div>`;
  const rows: [string, string, string | null][] = [
    [SELF_CONSUMPTION_SERIES, ENERGY_COLORS.community, slot.selfConsumptionText],
    [GRID_IMPORT_SERIES, ENERGY_COLORS.grid, slot.gridImportText],
    [SURPLUS_SERIES, ENERGY_COLORS.exported, slot.surplusText],
    [SAVINGS_SERIES, SAVINGS_COLOR, slot.savingsText],
  ];
  const figures = rows.flatMap(([label, swatch, value]) => (value === null ? [] : [tooltipRow(label, swatch, value)])).join("");
  return (
    `<div style="padding:8px 12px;max-width:280px;white-space:normal;background:${colors.background.paper};box-shadow:${shadows.dropdown};">` +
    `<div style="font-weight:600;margin-bottom:4px;color:${colors.text.primary};">${slot.name}</div>` +
    line(slot.stateText) +
    (isPlantSupply ? line(PLANT_TOOLTIP_TEXT) : "") +
    figures +
    `</div>`
  );
}

function baseOptions(view: ConsumptionSeriesView, isPlantSupply: boolean, annotations: ApexOptions["annotations"]): ApexOptions {
  const labels = new Map(view.slots.map((slot) => [slot.key, slot.axisLabel]));
  return {
    chart: { toolbar: { show: false }, animations: { enabled: false }, background: "transparent", zoom: { enabled: false } },
    annotations,
    dataLabels: { enabled: false },
    // ApexCharts draws bar fills at 85 % opacity by default, which lightens
    // every series off its token and below its measured contrast.
    fill: { opacity: 1 },
    grid: { borderColor: colors.border.light, strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: {
      type: "category",
      categories: view.categories,
      // The categories are the slots' dates, unique over any period; the axis
      // shows the thinned label, so no two labels overlap and none is rotated.
      labels: {
        formatter: (value: string) => labels.get(value) ?? "",
        style: { colors: colors.text.secondary, fontSize: "12px" },
        rotate: 0,
        hideOverlappingLabels: false,
        trim: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    legend: { show: false },
    states: { hover: { filter: { type: "darken" } } },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => slotTooltip(view.slots[dataPointIndex], isPlantSupply),
    },
  };
}

/** The energy chart, design option A: the stacked consumption bar, and the unused assigned energy beside it. */
export function energyChartOptions(view: ConsumptionSeriesView, isPlantSupply: boolean): ApexOptions {
  const base = baseOptions(view, isPlantSupply, view.energyAnnotations);
  return {
    ...base,
    chart: { ...base.chart, stacked: true },
    colors: [ENERGY_COLORS.community, ENERGY_COLORS.grid, ENERGY_COLORS.exported],
    plotOptions: { bar: { columnWidth: "80%", borderRadius: 2, borderRadiusApplication: "end", borderRadiusWhenStacked: "last" } },
    yaxis: { labels: { style: { colors: colors.text.secondary }, formatter: formatKilowattHours } },
  };
}

export function savingsChartOptions(view: ConsumptionSeriesView, isPlantSupply: boolean): ApexOptions {
  return {
    ...baseOptions(view, isPlantSupply, view.savingsAnnotations),
    colors: [SAVINGS_COLOR],
    plotOptions: { bar: { columnWidth: "50%", borderRadius: 2, borderRadiusApplication: "end" } },
    yaxis: { labels: { style: { colors: colors.text.secondary }, formatter: formatEuros } },
  };
}
