import { AppCard, Stat, Mui, Icons } from "conluz-web";

export const Plain = () => (
  <Mui.Box sx={{ maxWidth: 420 }}>
    <AppCard>
      <Mui.Box sx={{ p: 2.5, display: "grid", gap: 1.5 }}>
        <Mui.Typography variant="h6" sx={{ fontWeight: 700 }}>Planta Polideportivo</Mui.Typography>
        <Mui.Typography variant="body2" color="text.secondary">
          Avenida del Mediterráneo 88, 46900 Torrent, Valencia
        </Mui.Typography>
        <Mui.Box sx={{ display: "flex", gap: 4 }}>
          <Stat label="Potencia instalada" value="45,6 kW" />
          <Stat label="Suministros" value="28" />
        </Mui.Box>
      </Mui.Box>
    </AppCard>
  </Mui.Box>
);

export const WithHeader = () => (
  <Mui.Box sx={{ maxWidth: 420 }}>
    <AppCard
      header={
        <>
          <Mui.Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Icons.SolarPower />
            <Mui.Typography sx={{ fontWeight: 700 }}>Producción de hoy</Mui.Typography>
          </Mui.Box>
          <Mui.Chip label="En directo" size="small" sx={{ bgcolor: "white", color: "primary.main", fontWeight: 600 }} />
        </>
      }
    >
      <Mui.Box sx={{ p: 2.5, display: "flex", gap: 4 }}>
        <Stat label="Energía producida" value="182,4 kWh" variant="big" />
        <Stat label="Autoconsumo" value="62 %" variant="big" />
      </Mui.Box>
    </AppCard>
  </Mui.Box>
);

export const SideBySide = () => (
  <Mui.Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 3, maxWidth: 760 }}>
    <AppCard>
      <Mui.Box sx={{ p: 2.5 }}>
        <Stat label="Puntos de suministro" value="128" variant="big" />
      </Mui.Box>
    </AppCard>
    <AppCard>
      <Mui.Box sx={{ p: 2.5 }}>
        <Stat label="Plantas" value="3" variant="big" />
      </Mui.Box>
    </AppCard>
  </Mui.Box>
);
