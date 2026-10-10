import { EmptyState, Mui, Icons } from "conluz-web";

export const WithAction = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <EmptyState
      icon={Icons.SolarPower}
      title="No se encontraron plantas"
      subtitle="Comienza agregando tu primera planta de producción"
      actionButton={{ label: "Nueva planta", onClick: () => {}, startIcon: <Icons.Add /> }}
    />
  </Mui.Box>
);

export const NoResults = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <EmptyState
      icon={Icons.SearchOff}
      title="No se encontraron puntos de suministro"
      subtitle={'No hay resultados para "Panadería"'}
    />
  </Mui.Box>
);

export const ReadOnly = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <EmptyState
      icon={Icons.ElectricMeter}
      title="No hay puntos de suministro"
      subtitle="Todavía no hay ningún punto de suministro en esta comunidad."
      iconSize={48}
    />
  </Mui.Box>
);
