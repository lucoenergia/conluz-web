import { CardGrid, SupplyCard, AppCard, Stat, Mui } from "conluz-web";

const supplies = [
  { id: "sup-1", code: "ES0031406912345678JN0F", name: "Casa de Lucía", address: "Calle del Sol 14, 46900 Torrent, Valencia", enabled: true, lastConnection: "Hace 2 horas", lastMeasurement: 37 },
  { id: "sup-2", code: "ES0031406900011122ZX9B", name: "Panadería Martínez", address: "Avenida del Mediterráneo 88, 46900 Torrent, Valencia", enabled: true, lastConnection: "Hace 15 minutos", lastMeasurement: 84 },
  { id: "sup-3", code: "ES0031406987654321QW1A", name: "Local de la asociación", address: "Plaza Mayor 2, 46900 Torrent, Valencia", enabled: false, lastConnection: "Hace 6 días", lastMeasurement: 0 },
  { id: "sup-4", code: "ES0031406955544433KL2C", name: "Familia Ferrer Puig", address: "Carrer de Sant Josep 7, 46900 Torrent, Valencia", enabled: true, lastConnection: "Hace 1 hora", lastMeasurement: 52 },
];

export const SupplyCards = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <CardGrid
      items={supplies.slice(0, 2)}
      getKey={(s) => s.id}
      fadeTimeout={0}
      animationDelay={0}
      columns={{ xs: 2, sm: 2, md: 2, lg: 2 }}
      renderCard={(s) => <SupplyCard {...s} />}
    />
  </Mui.Box>
);

const kpis = [
  { label: "Energía producida", value: "182,4 kWh" },
  { label: "Energía consumida", value: "294,1 kWh" },
  { label: "Autoconsumo", value: "62 %" },
];

export const ThreeColumns = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <CardGrid
      items={kpis}
      getKey={(k) => k.label}
      fadeTimeout={0}
      animationDelay={0}
      columns={{ xs: 3, sm: 3, md: 3, lg: 3 }}
      renderCard={(k) => (
        <AppCard>
          <Mui.Box sx={{ p: 2.5 }}>
            <Stat label={k.label} value={k.value} variant="big" />
          </Mui.Box>
        </AppCard>
      )}
    />
  </Mui.Box>
);
