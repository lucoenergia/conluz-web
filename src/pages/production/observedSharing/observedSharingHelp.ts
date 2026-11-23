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

/** The terms the view's figures rest on, in the order the help dialog lists them. */
export const HELP_TERMS: HelpTerm[] = [
  { term: "β registrada", meaning: "el coeficiente guardado en el acuerdo." },
  {
    term: "β observada",
    meaning:
      "la parte de la producción de la planta que el punto recibió según Datadis, como mediana de sus días medibles.",
  },
  {
    term: "Día medible",
    meaning:
      "un día con datos completos del punto y de la planta en Datadis, en el que la planta produjo al menos 12 kWh (o 0,5 kWh por kWp si es más). Solo estos días se usan para comparar; no indica que el día sea correcto o incorrecto.",
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
};

/** What each anomaly type means. */
export const ANOMALY_TYPE_MEANING: Record<SharingAnomalyResponseType, string> = {
  UNKNOWN_COEFFICIENT: "el punto recibe un porcentaje que no coincide con ninguno de sus coeficientes registrados.",
  REVERTED: "el punto vuelve a recibir el valor de un acuerdo antiguo después de aplicarse uno posterior.",
  NO_ENERGY_IN_AGREEMENT: "el punto tiene coeficiente pero recibe 0.",
  ENERGY_OUTSIDE_AGREEMENT: "el punto recibe energía sin tener coeficiente en ningún acuerdo.",
  APPLIED_BEFORE_SENT: "el coeficiente se ve aplicado antes de la fecha en que se envió el fichero.",
};
