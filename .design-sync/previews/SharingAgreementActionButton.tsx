import { SharingAgreementActionButton, Mui, colors, radii } from "conluz-web";

const noop = () => {};

export const OnLight = () => (
  <Mui.Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
    <SharingAgreementActionButton emphasis="primary" action={{ label: "Poner en vigor", onClick: noop }} />
    <SharingAgreementActionButton emphasis="secondary" action={{ label: "Descargar fichero", onClick: noop }} />
    <SharingAgreementActionButton emphasis="quiet" action={{ label: "Volver a borrador", onClick: noop }} />
  </Mui.Box>
);

export const BlockedOnLight = () => (
  <Mui.Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
    <SharingAgreementActionButton
      emphasis="secondary"
      action={{
        label: "Descargar fichero",
        onClick: noop,
        disabledReason: "La planta no tiene CAU configurado.",
      }}
    />
    <SharingAgreementActionButton emphasis="primary" action={{ label: "Subir fichero de la distribuidora", onClick: noop }} />
  </Mui.Box>
);

export const OnBrand = () => (
  <Mui.Box
    sx={{
      bgcolor: colors.brand.main,
      borderRadius: radii.large,
      p: 3,
      display: "flex",
      gap: 1.5,
      flexWrap: "wrap",
      alignItems: "flex-start",
    }}
  >
    <SharingAgreementActionButton surface="onBrand" emphasis="primary" action={{ label: "Poner en vigor", onClick: noop }} />
    <SharingAgreementActionButton surface="onBrand" emphasis="secondary" action={{ label: "Descargar fichero", onClick: noop }} />
    <SharingAgreementActionButton surface="onBrand" emphasis="quiet" action={{ label: "Volver a borrador", onClick: noop }} />
  </Mui.Box>
);

export const BlockedOnBrand = () => (
  <Mui.Box
    sx={{
      bgcolor: colors.brand.main,
      borderRadius: radii.large,
      p: 3,
      display: "flex",
      gap: 1.5,
      flexWrap: "wrap",
      alignItems: "flex-start",
    }}
  >
    <SharingAgreementActionButton surface="onBrand" emphasis="primary" action={{ label: "Editar a mano", onClick: noop }} />
    <SharingAgreementActionButton
      surface="onBrand"
      emphasis="secondary"
      action={{ label: "Generar el fichero", onClick: noop, disabledReason: "Los coeficientes no suman 100,0000 %." }}
    />
  </Mui.Box>
);
