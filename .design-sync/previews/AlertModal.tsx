import { AlertModal } from "conluz-web";

export const Open = () => (
  <AlertModal isOpen onClose={() => {}}>
    No se ha podido descargar el fichero de coeficientes. Inténtalo de nuevo en unos instantes.
  </AlertModal>
);
