import { Mui, Notice } from "conluz-web";

export const Guidance = () => (
  <Mui.Box sx={{ maxWidth: 560 }}>
    <Notice severity="info">
      Registrarle no le envía nada. Quedará pendiente hasta que le invites desde la lista.
    </Notice>
  </Mui.Box>
);

export const ActionResult = () => (
  <Mui.Box sx={{ maxWidth: 560 }}>
    <Notice severity="success">
      Si tus datos son correctos, te hemos enviado un email con un enlace para restablecer tu contraseña.
    </Notice>
  </Mui.Box>
);

export const Caution = () => (
  <Mui.Box sx={{ maxWidth: 560 }}>
    <Notice severity="warning">
      Subir un fichero nuevo <strong>sustituye por completo</strong> el conjunto de coeficientes.
    </Notice>
  </Mui.Box>
);
