import { GraphBar, Mui } from "conluz-web";

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
const production = [0.4, 1.2, 2.3, 3.1, 3.6, 3.8, 3.5, 2.9, 2.1, 1.2, 0.5];

export const HourlyProduction = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <GraphBar title="Producción asignada" categories={hours} data={production} variant="production" height={280} />
  </Mui.Box>
);

export const MonthlyConsumption = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <GraphBar
      title="Consumo"
      categories={["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]}
      data={[312, 288, 246, 205, 190, 230, 298, 305, 240, 210, 255, 320]}
      variant="consumption"
      height={280}
    />
  </Mui.Box>
);
