import { GraphCard, MultiSeriesBar, GraphBar, Mui, colors } from "conluz-web";

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

// Mirrors SupplyDetailPage: the "Consumo" card wraps a MultiSeriesBar whose three
// series carry the page's own colours; the "Producción Asignada" card is what
// <Graph> renders (GraphCard + GraphBar).
const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export const DailyConsumption = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <GraphCard
      title="Consumo"
      subtitle="Rango: 10/10/2026"
      infoText="Visualización del consumo de red, autoconsumo y excedentes del punto de suministro"
      variant="consumption"
    >
      <MultiSeriesBar
        categories={hours}
        variant="consumption"
        series={[
          { name: "Consumo de Red", data: [0.9, 0.6, 0.3, 0.2, 0.1, 0.4, 0.5, 0.3, 0.6, 1.1, 1.4], color: colors.error.vivid },
          { name: "Autoconsumo", data: [0.2, 0.5, 0.9, 1.1, 1.2, 1.0, 0.8, 0.9, 0.7, 0.3, 0.1], color: colors.success.vivid },
          { name: "Excedentes", data: [0.0, 0.3, 0.8, 1.2, 1.5, 1.6, 1.4, 1.0, 0.5, 0.1, 0.0], color: colors.warning.vivid },
        ]}
      />
    </GraphCard>
  </Mui.Box>
);

export const WeeklyConsumption = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <GraphCard
      title="Consumo"
      subtitle="Rango: 04/10/2026 – 10/10/2026"
      infoText="Visualización del consumo de red, autoconsumo y excedentes del punto de suministro"
      variant="consumption"
    >
      <MultiSeriesBar
        categories={["04 oct", "05 oct", "06 oct", "07 oct", "08 oct", "09 oct", "10 oct"]}
        variant="consumption"
        series={[
          { name: "Consumo de Red", data: [6.2, 5.8, 7.1, 6.5, 5.9, 8.4, 9.0], color: colors.error.vivid },
          { name: "Autoconsumo", data: [4.1, 4.6, 3.9, 4.8, 5.2, 5.5, 4.9], color: colors.success.vivid },
          { name: "Excedentes", data: [1.3, 1.8, 0.9, 1.6, 2.1, 0.7, 0.5], color: colors.warning.vivid },
        ]}
      />
    </GraphCard>
  </Mui.Box>
);

export const AssignedProduction = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <GraphCard
      title="Producción Asignada"
      subtitle="Rango: 2026"
      infoText="Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto"
      variant="production"
    >
      <GraphBar
        title="Producción Asignada"
        categories={["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct"]}
        data={[96, 118, 164, 192, 221, 238, 246, 229, 181, 52]}
        variant="production"
      />
    </GraphCard>
  </Mui.Box>
);
