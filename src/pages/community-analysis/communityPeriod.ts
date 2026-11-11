import { anchorMonth, LAST_12, LATEST, monthYearName, YEAR, type Anchor } from "../../components/period/historicalPeriod";

// The period of "Energía de la comunidad" (#403): the presets of "Mi consumo y
// ahorro", anchored to the community's latest published month.

export const COMMUNITY_PRESETS = [LATEST, YEAR, LAST_12] as const;

/** No ?period= is "Último mes publicado". */
export const COMMUNITY_DEFAULT_PRESET = LATEST;

/** Why the period was adjusted to the community's anchor. */
export const communityClampNotice = (anchor: Anchor): string =>
  `La comunidad tiene datos publicados hasta ${monthYearName(anchorMonth(anchor))}, así que hemos ajustado el periodo.`;
