import { StatsCard, Mui, Icons, colors } from "conluz-web";

export const Consumption = () => (
  <Mui.Box sx={{ width: 760, maxWidth: "100%", position: "relative" }}>
    <StatsCard
      title="Consumo"
      subtitle="Consumo energético del punto de suministro"
      variant="consumption"
      icon={<Icons.Power sx={{ fontSize: 32 }} />}
      stats={[
        { label: "Consumo", value: "312,48 kWh", trend: 8, trendLabel: "vs período anterior", icon: <Icons.Power sx={{ fontSize: 24 }} />, color: colors.error.main },
        { label: "Autoconsumo", value: "184,20 kWh", trend: 14, trendLabel: "vs período anterior", icon: <Icons.BatteryChargingFull sx={{ fontSize: 24 }} />, color: colors.success.main },
        { label: "Excedentes", value: "42,75 kWh", trend: -6, trendLabel: "vs período anterior", icon: <Icons.EvStation sx={{ fontSize: 24 }} />, color: colors.warning.main },
      ]}
    />
  </Mui.Box>
);

export const Efficiency = () => (
  <Mui.Box sx={{ width: 560, maxWidth: "100%", position: "relative" }}>
    <StatsCard
      title="Eficiencia"
      subtitle="Indicadores de rendimiento energético"
      variant="production"
      icon={<Icons.TrendingUp sx={{ fontSize: 32 }} />}
      stats={[
        { label: "Porcentaje de autoconsumo", value: "58,95%", trend: 4, trendLabel: "vs período anterior", icon: <Icons.Percent sx={{ fontSize: 24 }} />, color: colors.accent.violet },
        { label: "Porcentaje de aprovechamiento", value: "81,12%", trend: -2, trendLabel: "vs período anterior", icon: <Icons.Percent sx={{ fontSize: 24 }} />, color: colors.accent.blue },
      ]}
    />
  </Mui.Box>
);

export const SingleStat = () => (
  <Mui.Box sx={{ width: 520, maxWidth: "100%", position: "relative" }}>
    <StatsCard
      title="Producción"
      subtitle="Producción energética de la planta"
      variant="production"
      icon={<Icons.SolarPower sx={{ fontSize: 32 }} />}
      stats={[
        { label: "Producción total", value: "1.284,60 kWh", trend: 12, trendLabel: "vs período anterior", icon: <Icons.SolarPower sx={{ fontSize: 24 }} />, color: "primary.main" },
      ]}
    />
  </Mui.Box>
);

export const NoTrendNoIcons = () => (
  <Mui.Box sx={{ width: 560, maxWidth: "100%", position: "relative" }}>
    <StatsCard
      title="Resumen del mes"
      stats={[
        { label: "Consumo", value: "296,10 kWh" },
        { label: "Autoconsumo", value: "171,35 kWh" },
      ]}
    />
  </Mui.Box>
);
