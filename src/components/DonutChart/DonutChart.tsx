import { useMemo, type FC } from "react";
import Chart from "react-apexcharts";

export interface DonutSegment {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  total?: number;
  size?: number;
  colors?: string[];
}

const DEFAULT_COLORS = [
  "#667eea", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#a855f7",
];

export const DonutChart: FC<DonutChartProps> = ({
  data,
  total = 1,
  size = 220,
  colors = DEFAULT_COLORS,
}) => {
  const { series, labels, chartColors, activeTotal } = useMemo(() => {
    const filtered = data.filter((d) => d.value > 0);
    return {
      series: filtered.map((d) => d.value),
      labels: filtered.map((d) => d.name),
      chartColors: filtered.map((d, i) => d.color || colors[i % colors.length]),
      activeTotal: filtered.reduce((s, d) => s + d.value, 0),
    };
  }, [data, colors]);

  const options = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        animations: {
          enabled: true,
          easing: "easeinout" as const,
          speed: 800,
        },
      },
      colors: chartColors,
      labels,
      plotOptions: {
        pie: {
          donut: {
            size: "65%",
            labels: {
              show: true,
              total: {
                show: activeTotal > 0,
                showAlways: activeTotal > 0,
                label: "Total",
                formatter: () => `${(total * 100).toFixed(2)}%`,
                color: "#1f2937",
                fontSize: "20px",
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 2, colors: ["white"] },
      tooltip: {
        enabled: activeTotal > 0,
        y: {
          formatter: (value: number) =>
            `${((value / activeTotal) * 100).toFixed(2)}%`,
        },
      },
      states: {
        hover: {
          filter: { type: "darken" as const, value: 0.15 },
        },
        active: {
          filter: { type: "darken" as const, value: 0.35 },
        },
      },
    }),
    [labels, chartColors, activeTotal, total],
  );

  if (activeTotal === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "grid",
          placeItems: "center",
        }}
      >
        <span style={{ color: "#6b7280", fontSize: 13 }}>Sin datos</span>
      </div>
    );
  }

  return (
    <Chart
      options={options}
      series={series}
      type="donut"
      width={size}
      height={size}
    />
  );
};
