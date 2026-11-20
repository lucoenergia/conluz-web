import { ENERGY_COLORS, LegendEntry, Mui, Swatch, colors } from "conluz-web";

const Legend = ({ children }: { children: React.ReactNode }) => (
  <Mui.Box component="ul" aria-label="Leyenda" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
    {children}
  </Mui.Box>
);

export const InverterToday = () => (
  <Legend>
    <LegendEntry swatch={<Swatch bgcolor={ENERGY_COLORS.assigned} />} label="Potencia del inversor (kW)" />
    <LegendEntry swatch={<Swatch bgcolor={colors.brand.main} line />} label="Ahora" />
    <LegendEntry swatch={<Swatch bgcolor={colors.background.surface} border={`1px solid ${colors.border.light}`} />} label="Sin datos" />
  </Legend>
);

export const MemberToday = () => (
  <Legend>
    <LegendEntry swatch={<Swatch bgcolor={ENERGY_COLORS.assigned} />} label="Energía que te tocó (kW)" />
    <LegendEntry swatch={<Swatch bgcolor={colors.brand.main} line />} label="Ahora" />
  </Legend>
);
