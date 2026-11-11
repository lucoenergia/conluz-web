// The words of "Hoy, según el inversor" on the plant detail (#406, UI-PLT-012).

export const POWER_SERIES = "Potencia del inversor";
export const NOW_LABEL = "Ahora";
export const GAP_LABEL = "Sin datos";
export const TODAY_TITLE = "Hoy, según el inversor";
export const TODAY_DESCRIPTION = "Datos del inversor. Pueden ser distintos de los de la distribuidora.";
export const NOT_STARTED = "Todavía no ha empezado a producir hoy";
export const NO_DATA_TODAY_TITLE = "Sin datos del inversor hoy";
export const NO_DATA_TODAY_BODY = "Cuando el inversor vuelva a enviar datos, la producción de hoy aparecerá aquí.";
export const TODAY_LOAD_ERROR = "No se pudo cargar la producción de hoy del inversor. Comprueba tu conexión e inténtalo de nuevo.";

/** "Hoy, hasta las 13:42": the figure's label, up to the latest snapshot. */
export const figureLabel = (lastUpdated: string) => `Hoy, hasta las ${lastUpdated}`;
export const updatedText = (lastUpdated: string) => `Actualizado a las ${lastUpdated}`;
/** The stale state in words: the server says the latest snapshot is more than an hour old. */
export const staleText = (lastUpdated: string) =>
  `Sin datos nuevos desde las ${lastUpdated}, hace más de 1 hora. La cifra y la curva llegan hasta esa hora.`;
/** Today's figure is the inverter's day counter, which a gap does not stop: only the curve misses the stretch. */
export const gapText = (gaps: string, several: boolean) =>
  several
    ? `Faltan datos ${gaps}. La curva no muestra esos tramos, pero la cifra de hoy sí los incluye.`
    : `Faltan datos ${gaps}. La curva no muestra ese tramo, pero la cifra de hoy sí lo incluye.`;
