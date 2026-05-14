import type { FC } from "react";

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
  const r = 80;
  const cx = size / 2;
  const cy = size / 2;
  let cum = 0;
  const segments = data.map((d, i) => {
    const start = cum / total;
    cum += d.value;
    const end = cum / total;
    const startAngle = start * Math.PI * 2 - Math.PI / 2;
    const endAngle = end * Math.PI * 2 - Math.PI / 2;
    const large = end - start > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { ...d, path, color: d.color || colors[i % colors.length] };
  });

  const activeTotal = data.reduce((s, d) => s + d.value, 0);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2">
          <title>{`${s.name}: ${activeTotal > 0 ? ((s.value / activeTotal) * 100).toFixed(2) : "0.00"}%`}</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={50} fill="white" />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="11"
        fill="#6b7280"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Total
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        fontSize="20"
        fontWeight="800"
        fill="#1f2937"
        fontFamily="'JetBrains Mono', monospace"
      >
        {(total * 100).toFixed(2)}%
      </text>
    </svg>
  );
};
