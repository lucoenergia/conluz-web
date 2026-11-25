import { pluralize } from "../../../utils/pluralize";

/**
 * The counted sentences of the set application dates flow, each in its
 * singular and its plural form: never "(s)" or "(n)".
 */

/** Dates step, from observed sharing: "1 punto necesita que escribas la fecha." */
export const datesToChoose = (n: number) => `${n} ${pluralize(n, "punto necesita", "puntos necesitan")} que escribas la fecha.`;

/** Dates step: "2 de 5 puntos marcados", agreeing with the total. */
export const selectedOfTotal = (selected: number, total: number) =>
  `${selected} de ${total} ${pluralize(total, "punto marcado", "puntos marcados")}`;

/** Dates step, below the rows shown: "Y 1 punto más". */
export const moreRows = (n: number) => `Y ${n} ${pluralize(n, "punto más", "puntos más")}`;

/** Preview summary figures' labels. */
export const datedCoefficientsLabel = (n: number) =>
  pluralize(n, "coeficiente de este acuerdo recibe fecha", "coeficientes de este acuerdo reciben fecha");
export const movedEndsLabel = (n: number) =>
  pluralize(n, "coeficiente anterior cambia su fin", "coeficientes anteriores cambian su fin");
export const leavingSuppliesLabel = (n: number) => pluralize(n, "punto sale del reparto", "puntos salen del reparto");

/** A refused dry run's title: "1 punto tiene un error". */
export const rowsWithErrors = (n: number) => `${n} ${pluralize(n, "punto tiene un error", "puntos tienen un error")}`;

/** A refused dry run's hint, agreeing with how many rows erred. */
export const fixRowsHint = (n: number) =>
  pluralize(n, "Corrígelo o desmárcalo para poder confirmar.", "Corrígelos o desmárcalos para poder confirmar.");
