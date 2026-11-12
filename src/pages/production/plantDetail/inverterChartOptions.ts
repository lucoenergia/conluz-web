import type { ApexOptions } from "apexcharts";
import { ENERGY_COLORS } from "../../../components/EnergyFigures/energyColors";
import { colors, fontSizes } from "../../../theme/tokens";
import { formatKilowatts } from "../../../utils/formatKilowatts";
import { axisTime, type InverterCurve } from "./inverterCurve";
import { GAP_LABEL, NOW_LABEL } from "./inverterTodayTexts";

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** ApexCharts hands its formatters floats a few ms off a tick: read them to the minute. */
const toMinute = (value: number) => Math.round(value / MINUTE_MS) * MINUTE_MS;

/**
 * The chart's options: the instant axis, the gold curve, the "Ahora" mark and the "Sin datos" bands.
 * `nowPowerKW` is the power the "Ahora" mark reads beside now's time, or null to show the time alone.
 */
export function inverterChartOptions(curve: InverterCurve, wide: boolean, nowPowerKW: number | null): ApexOptions {
  const { dayStart, dayEnd, gaps, now } = curve;
  return {
    chart: {
      id: "inverter-today",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      fontFamily: "inherit",
      parentHeightOffset: 0,
    },
    // Gold, the colour production has on every page; the area at 20 % (UI-PLT-013).
    colors: [ENERGY_COLORS.assigned],
    stroke: { curve: "straight", width: 2 },
    fill: { type: "solid", opacity: 0.2 },
    dataLabels: { enabled: false },
    markers: { size: 0 },
    legend: { show: false },
    grid: { borderColor: colors.divider, strokeDashArray: 0 },
    xaxis: {
      type: "numeric",
      min: dayStart,
      max: dayEnd,
      // One tick per hour of the day, 23, 24 or 25 of them; labelled every 3
      // hours from midnight on a wide screen, every 6 on a phone.
      tickAmount: Math.round((dayEnd - dayStart) / HOUR_MS),
      labels: {
        formatter: (value) => {
          const instant = toMinute(Number(value));
          const hours = Math.round((instant - dayStart) / HOUR_MS);
          return hours % (wide ? 3 : 6) === 0 ? axisTime(instant, dayEnd) : "";
        },
        style: { colors: colors.text.secondary, fontSize: fontSizes.xs },
        hideOverlappingLabels: false,
      },
      axisBorder: { color: colors.border.light },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      tickAmount: 4,
      labels: { formatter: (value) => formatKilowatts(value), style: { colors: colors.text.secondary, fontSize: fontSizes.xs } },
    },
    tooltip: {
      x: { formatter: (value) => axisTime(toMinute(value), dayEnd) },
      y: { formatter: (value) => formatKilowatts(value) },
    },
    annotations: {
      xaxis: [
        ...gaps.map(({ from, to }) => ({
          x: from,
          x2: to,
          fillColor: colors.background.surface,
          borderColor: colors.border.light,
          opacity: 1,
          label: {
            text: GAP_LABEL,
            orientation: "horizontal",
            position: "top",
            borderWidth: 0,
            style: { color: colors.text.secondary, background: colors.background.surface, fontSize: fontSizes.xs },
          },
        })),
        {
          x: now,
          borderColor: colors.brand.main,
          strokeDashArray: 0,
          label: {
            text: [NOW_LABEL, axisTime(now, dayEnd), ...(nowPowerKW === null ? [] : [formatKilowatts(nowPowerKW)])].join(" · "),
            orientation: "horizontal",
            position: "top",
            borderWidth: 0,
            style: { color: colors.brand.main, background: colors.background.paper, fontSize: fontSizes.xs, fontWeight: 600 },
          },
        },
      ],
    },
  };
}

