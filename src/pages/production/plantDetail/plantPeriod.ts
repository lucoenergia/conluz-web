import { anchorEnd, DAY_YEAR, dayName, LAST_30, LAST_7, type Anchor } from "../../../components/period/historicalPeriod";

// The period of "Producción por periodo" on the plant detail (#406): the
// day-anchored presets, anchored to the plant's latest complete production day.

export const PLANT_PRESETS = [LAST_7, LAST_30, DAY_YEAR] as const;

/** No ?period= is "Últimos 7 días". */
export const PLANT_DEFAULT_PRESET = LAST_7;

/**
 * When the distributor publishes the plant's production, without promising a
 * fixed delay: one or two days was observed once, and it can be longer.
 */
export const plantPublicationText = (anchor: Anchor): string =>
  `La distribuidora publica la producción con unos días de retraso, así que lo más reciente que puedes ver es el ${dayName(anchorEnd(anchor))}.`;

/** Why the period was adjusted to the plant's anchor. */
export const plantClampNotice = (anchor: Anchor): string =>
  `La distribuidora tiene la producción de esta planta hasta el ${dayName(anchorEnd(anchor))}, así que hemos ajustado el periodo.`;
