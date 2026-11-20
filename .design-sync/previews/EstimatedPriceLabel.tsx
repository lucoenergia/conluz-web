import { EstimatedPriceLabel, Mui } from "conluz-web";

export const Default = () => (
  <Mui.Box sx={{ maxWidth: 360, display: "flex", flexDirection: "column" }}>
    <EstimatedPriceLabel estimatedPrice={{ eurPerKWh: 0.15 }} />
  </Mui.Box>
);

export const UnderAnAmount = () => (
  <Mui.Box sx={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 1 }}>
    <Mui.Typography variant="body2" sx={{ color: "text.secondary" }}>
      Ahorro estimado este mes
    </Mui.Typography>
    <Mui.Typography variant="h4" component="p" sx={{ fontWeight: 700 }}>
      72,75 €
    </Mui.Typography>
    <EstimatedPriceLabel estimatedPrice={{ eurPerKWh: 0.1385 }} />
  </Mui.Box>
);
