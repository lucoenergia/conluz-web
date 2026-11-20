import { ENERGY_COLORS, Icons, LegendEntry, LoadingStat, Mui, NeutralNotice, PlantSection, Swatch, colors } from "conluz-web";

const TODAY_TITLE = "Hoy, según el inversor";
const TODAY_DESCRIPTION = "Datos del inversor. Pueden ser distintos de los de la distribuidora.";

export const InverterToday = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <PlantSection title={TODAY_TITLE} description={TODAY_DESCRIPTION} icon={Icons.WbSunny}>
      <Mui.Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Mui.Box role="group" aria-label="Hoy, hasta las 13:42" sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Mui.Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Swatch bgcolor={ENERGY_COLORS.assigned} />
            <Mui.Typography variant="body2" sx={{ color: colors.text.secondary }}>
              Hoy, hasta las 13:42
            </Mui.Typography>
          </Mui.Box>
          <Mui.Typography variant="h4" component="p" sx={{ color: colors.text.primary, fontWeight: 700 }}>
            48,6 kWh
          </Mui.Typography>
        </Mui.Box>
        <Mui.Box component="ul" aria-label="Leyenda" sx={{ display: "flex", flexWrap: "wrap", gap: 2, listStyle: "none", m: 0, p: 0 }}>
          <LegendEntry swatch={<Swatch bgcolor={ENERGY_COLORS.assigned} />} label="Potencia del inversor (kW)" />
          <LegendEntry swatch={<Swatch bgcolor={colors.brand.main} line />} label="Ahora" />
        </Mui.Box>
      </Mui.Box>
    </PlantSection>
  </Mui.Box>
);

export const NoDataToday = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <PlantSection title={TODAY_TITLE} description={TODAY_DESCRIPTION} icon={Icons.WbSunny}>
      <NeutralNotice title="Sin datos del inversor hoy">
        Cuando el inversor vuelva a enviar datos, la producción de hoy aparecerá aquí.
      </NeutralNotice>
    </PlantSection>
  </Mui.Box>
);

export const Loading = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <PlantSection title="Ahora" description="Lo que te llega de la planta de la comunidad." icon={Icons.BoltRounded}>
      <Mui.Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "flex-start" }}>
        <Mui.Skeleton variant="rounded" sx={{ width: "100%", maxWidth: 360, aspectRatio: "340 / 316", height: "auto" }} />
        <Mui.Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <LoadingStat variant="big" label="Te llega ahora" />
          <LoadingStat variant="big" label="Energía que te tocó hoy" />
        </Mui.Box>
      </Mui.Box>
    </PlantSection>
  </Mui.Box>
);
