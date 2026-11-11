import type { SupplyResponse } from "../../api/models";
import { anchorMonth, LAST_12, LATEST, monthYearName, YEAR, type Anchor } from "../../components/period/historicalPeriod";

// The period of "Mi consumo y ahorro" (#248): its presets, and the words its
// period shares with the supply detail's latest published month (#252).

export const MEMBER_PRESETS = [LATEST, YEAR, LAST_12] as const;

/** No ?period= is "Último mes publicado". */
export const MEMBER_DEFAULT_PRESET = LATEST;

/** Why the period was adjusted to the anchor: "Tus puntos tienen…" for "Todos mis puntos", "Este punto tiene…" for one supply. */
export const memberClampNotice =
  (selected: SupplyResponse | null) =>
  (anchor: Anchor): string => {
    const subject = selected ? "Este punto tiene" : "Tus puntos tienen";
    return `${subject} datos publicados hasta ${monthYearName(anchorMonth(anchor))}, así que hemos ajustado el periodo.`;
  };

/** When data is published, under the period's header. */
export const memberPublicationText = (anchor: Anchor): string =>
  "Los datos de cada mes se publican hacia el día 10 del mes siguiente, así que lo más reciente que puedes ver es " +
  `${monthYearName(anchorMonth(anchor))}.`;
