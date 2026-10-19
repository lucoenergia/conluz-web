import { NextStepBanner, Mui, colors } from "conluz-web";

// White on the brand card, as the plant detail and the agreement's next step have it.
const WhiteAction = ({ children }: { children: string }) => (
  <Mui.Button
    variant="contained"
    disableElevation
    sx={{
      alignSelf: "flex-start",
      minHeight: 44,
      bgcolor: colors.background.paper,
      color: colors.brand.dark,
      "&:hover": { bgcolor: colors.brand.onSoft },
    }}
  >
    {children}
  </Mui.Button>
);

const wrap = (children: any) => <Mui.Box sx={{ maxWidth: 960 }}>{children}</Mui.Box>;

export const ConfigureIntegration = () =>
  wrap(
    <NextStepBanner headline="Configura la integración con Huawei para recibir la producción de esta planta.">
      <WhiteAction>Configurar integración</WhiteAction>
    </NextStepBanner>,
  );

export const ActivateIntegration = () =>
  wrap(
    <NextStepBanner headline="Activa la integración con Huawei para que la producción de esta planta empiece a sincronizarse.">
      <WhiteAction>Activar integración</WhiteAction>
    </NextStepBanner>,
  );

export const Closed = () =>
  wrap(
    <NextStepBanner
      isClosed
      headline="Este acuerdo ya no está en vigor. Puedes consultarlo y corregir fechas de aplicación."
    />,
  );
