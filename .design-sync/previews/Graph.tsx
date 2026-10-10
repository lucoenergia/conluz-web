import { Graph, Mui } from "conluz-web";

// Preview-only: the chart components hard-code an 800 ms ApexCharts entry animation
// (+150 ms per bar) with no prop to turn it off, so a capture lands mid-animation with
// short bars. ApexCharts' bundled SVG.js clocks its animations off performance.now();
// running that clock 20x faster lets the bars reach full height before the screenshot.
// Guarded so several chart previews on one page patch it once.
const w = window as unknown as { __dsFastCharts?: boolean };
if (!w.__dsFastCharts) {
  w.__dsFastCharts = true;
  const realNow = performance.now.bind(performance);
  const t0 = realNow();
  performance.now = () => t0 + (realNow() - t0) * 20;
}

const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export const AssignedProduction = () => (
  <Mui.Box sx={{ maxWidth: 760 }}>
    <Graph
      title="Producción Asignada"
      subtitle="Rango: 10/10/2026"
      values={[0.4, 1.2, 2.3, 3.1, 3.6, 3.8, 3.5, 2.9, 2.1, 1.2, 0.5]}
      xAxis={hours}
      info="Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto"
      variant="production"
    />
  </Mui.Box>
);

export const YearlyTotals = () => (
  <Mui.Box sx={{ maxWidth: 760 }}>
    <Graph
      title="Producción Asignada"
      subtitle="Rango: 2023 – 2026"
      values={[1840, 2310, 2475, 1960]}
      xAxis={["2023", "2024", "2025", "2026"]}
      info="Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto"
    />
  </Mui.Box>
);
