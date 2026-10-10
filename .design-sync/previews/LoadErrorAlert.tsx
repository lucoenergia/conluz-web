import { LoadErrorAlert, Mui } from "conluz-web";

export const Default = () => (
  <Mui.Box sx={{ maxWidth: 640 }}>
    <LoadErrorAlert message="No se pudieron cargar los puntos de suministro." onRetry={() => {}} />
  </Mui.Box>
);

export const LongMessage = () => (
  <Mui.Box sx={{ maxWidth: 420 }}>
    <LoadErrorAlert
      message="No se pudo cargar el histórico de coeficientes de este punto de suministro. Comprueba tu conexión e inténtalo de nuevo."
      onRetry={() => {}}
    />
  </Mui.Box>
);
