import { MultiSeriesBar, Mui } from "conluz-web";

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

const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const Consumption = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <MultiSeriesBar
      categories={days}
      variant="consumption"
      height={300}
      series={[
        { name: "Consumo de Red", data: [6.2, 5.8, 7.1, 6.5, 5.9, 8.4, 9.0] },
        { name: "Autoconsumo", data: [4.1, 4.6, 3.9, 4.8, 5.2, 5.5, 4.9] },
        { name: "Excedentes", data: [1.3, 1.8, 0.9, 1.6, 2.1, 0.7, 0.5] },
      ]}
    />
  </Mui.Box>
);

export const Production = () => (
  <Mui.Box sx={{ maxWidth: 720 }}>
    <MultiSeriesBar
      categories={["Ene", "Feb", "Mar", "Abr", "May", "Jun"]}
      variant="production"
      height={300}
      series={[
        { name: "Polideportivo", data: [820, 960, 1240, 1480, 1690, 1820] },
        { name: "CEIP Lluís Vives", data: [410, 480, 630, 740, 850, 910] },
      ]}
    />
  </Mui.Box>
);
