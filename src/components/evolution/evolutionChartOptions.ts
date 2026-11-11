import type { ApexOptions } from "apexcharts";
import { formatEuros, formatKilowattHours } from "../../utils/formatEnergyFigures";
import { colors, shadows } from "../../theme/tokens";
import type { EvolutionSlot, EvolutionView, SeriesLook } from "./evolutionSeries";

// The options and tooltip of the evolution charts (#250), apart from the
// components so a spec can build them without rendering ApexCharts.

/** A label, and the technical term it carries muted after it (UI-HIS-027). */
function pairedTermHtml(term: string, technical: string | undefined): string {
  return technical ? `${term} <span style="color:${colors.text.secondary};">· ${technical}</span>` : term;
}

function tooltipRow({ term, technical, swatch, value }: SlotFigure): string {
  return `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;"><span style="display:flex;align-items:center;gap:6px;color:${colors.text.body};"><span style="flex:none;width:8px;height:8px;border-radius:2px;background:${swatch};"></span><span>${pairedTermHtml(term, technical)}</span></span><span style="font-weight:600;color:${colors.text.primary};white-space:nowrap;">${value}</span></div>`;
}

/** One figure of a slot's detail: its series' home term and technical term, swatch and value. */
export interface SlotFigure {
  term: string;
  technical?: string;
  swatch: string;
  value: string;
}

/**
 * A slot in words: its date, its state, the page's own lines about the scope
 * (`extraLines`), and its figures when it has any. The tooltip and, below sm,
 * a row's detail (UI-HIS-026) both say exactly this.
 */
export function slotDetail<K extends string>(
  slot: EvolutionSlot<K>,
  look: SeriesLook<K>,
  extraLines: readonly string[],
): { title: string; lines: string[]; figures: SlotFigure[] } {
  const rows: [string, string | undefined, string, string | null][] = [
    ...look.segments.map(({ key, label, technicalTerm, color }) => [label, technicalTerm, color, slot.texts[key]] as [string, string | undefined, string, string | null]),
    ...(look.savings ? [[look.savings.label, undefined, look.savings.color, slot.savingsText] as [string, undefined, string, string | null]] : []),
  ];
  return {
    title: slot.name,
    lines: [slot.stateText, ...extraLines],
    figures: rows.flatMap(([term, technical, swatch, value]) => (value === null ? [] : [{ term, ...(technical && { technical }), swatch, value }])),
  };
}

/** The slot's detail as the charts' tooltip. Both charts show the same one, so a reader gets every figure of the slot from either. */
export function slotTooltip<K extends string>(slot: EvolutionSlot<K>, look: SeriesLook<K>, extraLines: readonly string[]): string {
  const { title, lines, figures } = slotDetail(slot, look, extraLines);
  const line = (text: string) => `<div style="font-size:12px;color:${colors.text.body};margin-bottom:4px;">${text}</div>`;
  return (
    `<div style="padding:8px 12px;max-width:280px;white-space:normal;background:${colors.background.paper};box-shadow:${shadows.dropdown};">` +
    `<div style="font-weight:600;margin-bottom:4px;color:${colors.text.primary};">${title}</div>` +
    lines.map(line).join("") +
    figures.map(tooltipRow).join("") +
    `</div>`
  );
}

function baseOptions<K extends string>(
  view: EvolutionView<K>,
  look: SeriesLook<K>,
  extraLines: readonly string[],
  annotations: ApexOptions["annotations"],
): ApexOptions {
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
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => slotTooltip(view.slots[dataPointIndex], look, extraLines),
    },
  };
}

/** The energy chart, design option A: each group of segments a bar, stacked, the groups side by side. */
export function energyChartOptions<K extends string>(view: EvolutionView<K>, look: SeriesLook<K>, extraLines: readonly string[]): ApexOptions {
  const base = baseOptions(view, look, extraLines, view.energyAnnotations);
  return {
    ...base,
    chart: { ...base.chart, stacked: true },
    colors: look.segments.map(({ color }) => color),
    plotOptions: { bar: { columnWidth: "80%", borderRadius: 2, borderRadiusApplication: "end", borderRadiusWhenStacked: "last" } },
    yaxis: { labels: { style: { colors: colors.text.secondary }, formatter: formatKilowattHours } },
  };
}

/** The savings chart of a series that has savings: `savings` is its look's. */
export function savingsChartOptions<K extends string>(
  view: EvolutionView<K>,
  look: SeriesLook<K>,
  savings: NonNullable<SeriesLook<K>["savings"]>,
  extraLines: readonly string[],
): ApexOptions {
  return {
    ...baseOptions(view, look, extraLines, view.savingsAnnotations),
    colors: [savings.color],
    plotOptions: { bar: { columnWidth: "50%", borderRadius: 2, borderRadiusApplication: "end" } },
    yaxis: { labels: { style: { colors: colors.text.secondary }, formatter: formatEuros } },
  };
}
