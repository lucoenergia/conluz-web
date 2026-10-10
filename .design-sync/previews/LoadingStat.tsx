import { LoadingStat, Stat, Mui } from "conluz-web";

export const Normal = () => (
  <Mui.Box sx={{ width: 200 }}>
    <LoadingStat label="Potencia instalada" />
  </Mui.Box>
);

export const Big = () => (
  <Mui.Box sx={{ width: 240 }}>
    <LoadingStat label="Energía producida hoy" variant="big" />
  </Mui.Box>
);

export const LoadingVsLoaded = () => (
  <Mui.Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 200px)", gap: 4 }}>
    <LoadingStat label="Consumo" variant="big" />
    <Stat label="Consumo" value="312,5 kWh" variant="big" />
  </Mui.Box>
);
