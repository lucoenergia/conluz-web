import { SectionHeading, Mui, sxStyles } from "conluz-web";

export const Default = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <SectionHeading
      title="Fichero para la distribuidora"
      description="El TXT con los coeficientes que la distribuidora necesita para aplicar el reparto."
    />
  </Mui.Box>
);

export const InAPanel = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <Mui.Paper elevation={0} sx={sxStyles.softPanel}>
      <SectionHeading
        title="Histórico de coeficientes"
        description="Qué parte de la producción se ha asignado a este punto de suministro y desde cuándo, en cada planta en la que participa."
      />
      <Mui.Typography variant="body2" color="text.secondary">
        Planta Polideportivo · 2,4500 % desde el 1 ene 2026
      </Mui.Typography>
    </Mui.Paper>
  </Mui.Box>
);
