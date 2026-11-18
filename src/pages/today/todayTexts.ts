// The words of "Datos de hoy" (#432).

export const PAGE_TITLE = "Datos de hoy";
export const SELECTOR_LABEL = "Punto de suministro";

export const NOW_TITLE = "Ahora";
export const NOW_DESCRIPTION = "Lo que te llega de la planta de la comunidad.";
export const CURVE_TITLE = "Hoy, cada 5 minutos";
export const CURVE_DESCRIPTION = "La potencia que te ha llegado a lo largo del día.";

export const PLANT_NODE_LABEL = "Producción de la comunidad";
export const SUPPLY_NODE_LABEL = "Tu punto";
export const CURVE_SERIES = "Energía que te tocó";

export const CURRENT_FIGURE = "Te llega ahora";
export const ENERGY_FIGURE = "Energía que te tocó hoy";

export const freshnessText = (lastUpdated: string) => `Último dato: ${lastUpdated}`;
export const flowingCaption = "te llegan ahora";
export const staleCaption = (lastUpdated: string) => `te llegaban a las ${lastUpdated}`;
export const stalePlantPower = (kW: string, lastUpdated: string) => `${kW} a las ${lastUpdated}`;
export const staleFigure = (lastUpdated: string) => `Te llegaba a las ${lastUpdated}`;

export const flowingSentence = (kW: string) => `Ahora te llegan ${kW} de la planta de la comunidad.`;
export const staleSentence = (lastUpdated: string, kW: string) =>
  `A las ${lastUpdated} te llegaban ${kW} de la planta de la comunidad.`;
export const notProducingSentence = (kWh: string) => `La planta no está produciendo ahora. Hoy te llegaron ${kWh}.`;
export const noCurrentDataSentence = (kWh: string) => `Ahora mismo no hay dato de la planta. Hoy te llegaron ${kWh}.`;

export const coefficientText = (percentage: string) => `Te corresponde el ${percentage} de la producción de la planta.`;

export const staleNotice = (lastUpdated: string) =>
  `Sin datos nuevos desde las ${lastUpdated}. Lo seguimos intentando cada 5 minutos; las cifras y la curva llegan hasta esa hora.`;

export const INVERTER_NOTE =
  "Datos del inversor de la planta. Pueden diferir un poco de los que publica la distribuidora.";
export const INVERTER_NOTE_GAPS = "La cifra de hoy incluye los ratos sin dato de la curva.";

export const NO_DATA_TODAY_TITLE = "La planta aún no ha empezado a producir hoy";
export const NO_DATA_TODAY_TEXT =
  "En cuanto empiece, aquí verás la energía que te llega. Los datos se actualizan cada 5 minutos.";
export const NOT_AVAILABLE_TITLE = "Tu planta aún no envía datos de hoy";
export const NOT_AVAILABLE_TEXT =
  "Cuando la comunidad conecte el inversor de la planta con Conluz, aquí verás cuánta energía te llega en cada momento.";
export const NO_COEFFICIENT_TITLE = "Hoy no te corresponde energía en este punto";
export const NO_COEFFICIENT_TEXT =
  "Este punto de suministro no tiene un coeficiente de reparto en vigor hoy, así que no recibe parte de la producción de la planta. Si crees que no es correcto, habla con tu comunidad.";
export const CONTACT_LINK = "Ver el contacto de tu comunidad";

export const LOAD_ERROR =
  "No se pudieron cargar los datos de hoy de este punto. Comprueba tu conexión e inténtalo de nuevo.";

export const NO_SUPPLIES_TITLE = "Todavía no tienes puntos de suministro";
export const NO_SUPPLIES_TEXT =
  "Cuando la comunidad dé de alta un punto de suministro a tu nombre, aquí verás la energía que le llega cada día.";

export const ADMIN_NOTICE = "Este punto no es tuyo. Lo ves porque gestionas la comunidad.";
export const BACK_TO_SUPPLY = "Volver al punto de suministro";
