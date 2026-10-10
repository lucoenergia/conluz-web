import { CoefficientDialogErrorPanel, Mui } from "conluz-web";

export const WithMessages = () => (
  <Mui.Box sx={{ maxWidth: 480 }}>
    <CoefficientDialogErrorPanel
      errorMessages={[
        "La fecha de aplicación no puede ser anterior a la fecha de puesta en vigor del acuerdo (01/02/2026).",
        "El suministro ES0031406912345678JN0F ya tiene un coeficiente aplicado en esa fecha.",
      ]}
    />
  </Mui.Box>
);

export const GenericFailure = () => (
  <Mui.Box sx={{ maxWidth: 480 }}>
    <CoefficientDialogErrorPanel errorMessages={[]} />
  </Mui.Box>
);
