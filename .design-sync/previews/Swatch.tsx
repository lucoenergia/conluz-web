import { ENERGY_COLORS, Mui, SAVINGS_COLOR, Swatch, colors } from "conluz-web";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Mui.Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    {children}
    <Mui.Typography variant="body2">{label}</Mui.Typography>
  </Mui.Box>
);

export const EnergyConcepts = () => (
  <Mui.Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    <Row label="Energía que te tocó">
      <Swatch bgcolor={ENERGY_COLORS.assigned} />
    </Row>
    <Row label="De la comunidad">
      <Swatch bgcolor={ENERGY_COLORS.community} />
    </Row>
    <Row label="De la red">
      <Swatch bgcolor={ENERGY_COLORS.grid} />
    </Row>
    <Row label="Se fue a la red">
      <Swatch bgcolor={ENERGY_COLORS.exported} />
    </Row>
    <Row label="Ahorro estimado">
      <Swatch bgcolor={SAVINGS_COLOR} />
    </Row>
  </Mui.Box>
);

export const LineAndGap = () => (
  <Mui.Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    <Row label="Ahora (una línea)">
      <Swatch bgcolor={colors.brand.main} line />
    </Row>
    <Row label="Sin datos (con borde)">
      <Swatch bgcolor={colors.background.surface} border={`1px solid ${colors.border.light}`} />
    </Row>
  </Mui.Box>
);
