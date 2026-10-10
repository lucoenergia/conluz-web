import { Stat, Mui } from "conluz-web";

export const Normal = () => <Stat label="Potencia instalada" value="45,6 kW" />;

export const Big = () => <Stat label="Energía producida hoy" value="182,4 kWh" variant="big" />;

export const InARow = () => (
  <Mui.Box sx={{ display: "flex", gap: 4 }}>
    <Stat label="Puntos de suministro" value="128" />
    <Stat label="Plantas" value="3" />
    <Stat label="Autoconsumo" value="62 %" />
  </Mui.Box>
);
