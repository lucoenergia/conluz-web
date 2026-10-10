import { PlatformKpiCard, Mui } from "conluz-web";

export const Single = () => (
  <Mui.Box sx={{ width: 240 }}>
    <PlatformKpiCard label="Comunidades" value={12} sublabel="10 con usuarios · 2 sin usuarios" />
  </Mui.Box>
);

/** The platform dashboard on narrow screens: two columns. */
export const DashboardGrid = () => (
  <Mui.Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", width: 520 }}>
    <PlatformKpiCard label="Comunidades" value={12} sublabel="10 con usuarios · 2 sin usuarios" />
    <PlatformKpiCard label="Usuarios" value="326" sublabel="personas distintas" />
    <PlatformKpiCard label="Comunidades sin administrador" value={1} sublabel="requieren atención" />
    <PlatformKpiCard label="Deshabilitadas" value={0} sublabel="ninguna fuera de servicio" />
  </Mui.Box>
);

export const ThreeCards = () => (
  <Mui.Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", width: 600 }}>
    <PlatformKpiCard label="Comunidades" value={4} sublabel="todas con usuarios" />
    <PlatformKpiCard label="Comunidades sin administrador" value={0} sublabel="ninguna pendiente" />
    <PlatformKpiCard label="Deshabilitadas" value={1} sublabel="Renovables de Xàtiva" />
  </Mui.Box>
);
