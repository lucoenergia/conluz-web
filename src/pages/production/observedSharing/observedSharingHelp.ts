import type {
  CoefficientObservationResponseStatus,
  LeavingObservationResponseStatus,
  SharingAnomalyResponseType,
} from "../../../api/models";

/** A term of the view and what it means, as the help dialog lists it. */
export interface HelpTerm {
  term: string;
  meaning: string;
  /** The parts the meaning names, listed under it. */
  parts?: string[];
}

/** The term the "Días medibles" column's header opens the help at (UI-AGR-042). */
export const ROW_PERIOD_TERM = "Periodo de cada punto";

/** The terms the view's figures rest on, in the order the help dialog lists them. */
export const HELP_TERMS: HelpTerm[] = [
  { term: "β registrada", meaning: "el coeficiente guardado en el acuerdo." },
  {
    term: "β esperada",
    meaning:
      "el coeficiente registrado del punto en el acuerdo al que se atribuye la anomalía (0 si no tiene coeficiente en él).",
  },
  {
    term: "β observada",
    meaning:
      "la parte de la producción de la planta que el punto recibió según Datadis, como mediana de sus días medibles.",
  },
  {
    term: "Día medible",
    meaning:
      "un día con datos completos del punto y de la planta en Datadis, en el que la planta produjo al menos 12 kWh (o 0,5 kWh por kWp si es más). Solo estos días se usan para comparar; no indica que el día sea correcto o incorrecto. Por eso un periodo tiene menos días medibles que días naturales: se descartan los días de poca producción (sobre todo en invierno) y los días sin datos completos.",
  },
  {
    term: "Periodo de aplicación del acuerdo",
    meaning:
      "desde la fecha en que Datadis lo ve aplicado en la mayoría de puntos hasta el día antes de que se aplique el siguiente acuerdo, o hasta el último dato disponible. La producción no atribuida se calcula sobre sus días medibles.",
  },
  {
    term: ROW_PERIOD_TERM,
    meaning:
      "desde la fecha en que Datadis ve aplicado el coeficiente de ese punto hasta el final del periodo del acuerdo. Si el punto se ve aplicado antes que el resto, su periodo es más largo; si no tiene fecha observada, es el del acuerdo.",
  },
  {
    term: "Producción no atribuida (1 − Σβ)",
    meaning:
      "de toda la energía que produjo la planta en los días medibles en que se aplicaba el acuerdo, la parte que Datadis no muestra en ningún punto con datos. Σβ es la suma de lo que recibieron los puntos. Se divide en dos:",
    parts: [
      "la parte registrada de los puntos que no tenían datos esos días, que es normal y no indica un error;",
      "un resto. Cerca de 0 es redondeo. Positivo: producción que no llegó a ningún punto registrado (puede haber un punto sin registrar o coeficientes que no suman 100 %). Negativo: los puntos con datos recibieron más de lo registrado, y si la cifra total es negativa, algún dato de Datadis es erróneo.",
    ],
  },
];

/** What each coefficient status means. A Record, so a status the client gains does not compile without one. */
export const COEFFICIENT_STATUS_MEANING: Record<CoefficientObservationResponseStatus, string> = {
  APPLIED_SAME_DATE: "Datadis muestra el coeficiente desde la fecha registrada.",
  APPLIED_DIFFERENT_DATE: "Datadis muestra el coeficiente, pero desde otra fecha, o no hay fecha registrada.",
  PENDING_APPLICATION: "el fichero se envió, pero Datadis todavía no muestra este coeficiente.",
  NOT_DISTINGUISHABLE:
    "tiene el mismo valor que el coeficiente anterior, así que en Datadis no se ve cuándo cambió. La fecha que se muestra es una propuesta.",
  NOT_OBSERVED: "hay días medibles, pero el coeficiente no aparece nunca y el acuerdo no tiene fecha de envío.",
  NO_DATA: "el punto no tiene ningún día medible.",
  NOT_OBSERVABLE: "la energía de este punto en Datadis es la producción de la planta, así que su parte no se puede medir.",
};

/** What each leaving status means: a coefficient's meaning, applied to the day the previous coefficient ends. */
export const LEAVING_STATUS_MEANING: Record<LeavingObservationResponseStatus, string> = {
  APPLIED_SAME_DATE: "Datadis muestra que el punto deja de recibir su coeficiente anterior desde la fecha de fin registrada.",
  APPLIED_DIFFERENT_DATE:
    "Datadis muestra que el punto deja de recibir su coeficiente anterior, pero desde otra fecha, o no hay fecha de fin registrada.",
  PENDING_APPLICATION: "el fichero se envió, pero Datadis todavía muestra que el punto recibe su coeficiente anterior.",
  NOT_DISTINGUISHABLE:
    "en Datadis no se ve cuándo dejó de recibir su coeficiente anterior. La fecha que se muestra es una propuesta.",
  NOT_OBSERVED:
    "hay días medibles, pero no se ve que el punto deje de recibir su coeficiente anterior y el acuerdo no tiene fecha de envío.",
  NO_DATA: "el punto no tiene ningún día medible.",
  NOT_OBSERVABLE:
    "la energía de este punto en Datadis es la producción de la planta, así que no se puede medir cuándo deja de recibir su coeficiente anterior.",
};

/** What each anomaly type means. */
export const ANOMALY_TYPE_MEANING: Record<SharingAnomalyResponseType, string> = {
  UNKNOWN_COEFFICIENT: "el punto recibe un porcentaje que no coincide con ninguno de sus coeficientes registrados.",
  REVERTED: "el punto vuelve a recibir el valor de un acuerdo antiguo después de aplicarse uno posterior.",
  NO_ENERGY_IN_AGREEMENT: "el punto tiene coeficiente pero recibe 0.",
  ENERGY_OUTSIDE_AGREEMENT: "el punto recibe energía sin tener coeficiente en ningún acuerdo.",
  APPLIED_BEFORE_SENT: "el coeficiente se ve aplicado antes de la fecha en que se envió el fichero.",
};
