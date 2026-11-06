/** The overlay's title while the code shows. */
export const CONFIRMATION_CODE_TITLE = "Código de confirmación";

/**
 * What a close attempt other than "Hecho" asks while the code shows (#370):
 * the code is shown once, and back must not lose it silently.
 */
export const CONFIRMATION_CODE_CLOSE_QUESTION = {
  discardMessage: "Este código no se volverá a mostrar. ¿Lo has copiado?",
  discardConfirmLabel: "Cerrar sin copiar",
  discardCancelLabel: "Volver al código",
} as const;
