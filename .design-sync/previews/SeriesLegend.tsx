import { ENERGY_COLORS, SAVINGS_COLOR, SeriesLegend } from "conluz-web";

export const Consumption = () => (
  <SeriesLegend
    items={[
      { label: "De la comunidad", companion: "autoconsumo", swatch: { bgcolor: ENERGY_COLORS.community } },
      { label: "De la red", swatch: { bgcolor: ENERGY_COLORS.grid } },
    ]}
  />
);

export const Savings = () => <SeriesLegend items={[{ label: "Ahorro estimado", swatch: { bgcolor: SAVINGS_COLOR } }]} />;
