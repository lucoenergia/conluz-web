import { SupplyProductionTodayResponseStatus, type SupplyProductionTodayResponse } from "../../api/models";
import { formatTimeOfDay } from "../../utils/formatCalendarDate";
import { formatKilowattHours } from "../../utils/formatEnergyFigures";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { formatPercentage } from "../../utils/formatPercentage";
import {
  CURRENT_FIGURE,
  ENERGY_FIGURE,
  INVERTER_NOTE,
  INVERTER_NOTE_GAPS,
  NOT_AVAILABLE_TEXT,
  NOT_AVAILABLE_TITLE,
  NO_COEFFICIENT_TEXT,
  NO_COEFFICIENT_TITLE,
  NO_DATA_TODAY_TEXT,
  NO_DATA_TODAY_TITLE,
  coefficientText,
  flowingSentence,
  noCurrentDataSentence,
  notProducingSentence,
  staleFigure,
  staleNotice,
  staleSentence,
} from "./todayTexts";

/** How the energy-flow hero draws the plant, the conduit and the supply. */
export type HeroMode = "flowing" | "idle" | "waiting" | "unavailable";

const MIN_THICKNESS = 3;
const MAX_THICKNESS = 14;

/**
 * The conduit's thickness in px for a power in kW (UI-TDY-006): 3 + 3.2·log₂(1 + P/0.25),
 * clamped to [3, 14]. The scale is absolute, so the same kW looks the same for every supply.
 */
export function conduitThickness(powerKW: number): number {
  const raw = MIN_THICKNESS + 3.2 * Math.log2(1 + Math.max(0, powerKW) / 0.25);
  return Math.min(MAX_THICKNESS, Math.max(MIN_THICKNESS, raw));
}

/** A figure of the "Ahora" card: its label and its formatted value. */
export interface TodayFigure {
  label: string;
  value: string;
}

/** A status with nothing to show yet: the hero and a title with its explanation. */
export interface WithoutDataView {
  kind: "withoutData";
  heroMode: "waiting" | "unavailable";
  title: string;
  text: string;
  /** The link to the community's contact page, when the state asks the member to talk to it. */
  contactLink: string | null;
}

/** AVAILABLE: what the "Ahora" card and the curve show. */
export interface AvailableView {
  kind: "available";
  heroMode: "flowing" | "idle";
  /** The power the conduit carries; null when there is no current value. */
  powerKW: number | null;
  plantPowerKW: number | null;
  /** The latest snapshot's time, "13:05". */
  lastUpdated: string | null;
  /** Set only when the data is stale: the time the figures stop at. */
  staleAt: string | null;
  statusSentence: string;
  /** "Te llega ahora", shown only while some power arrives. */
  currentFigure: TodayFigure | null;
  energyFigure: TodayFigure;
  /** The β line, hidden when the coefficient is null or 0. */
  coefficientLine: string | null;
  staleNotice: string | null;
  /** What the curve's "Ahora" mark reads beside the time: none when stale, or with no current value. */
  nowPowerKW: number | null;
  note: string;
}

export type TodayView = WithoutDataView | AvailableView;

const COEFFICIENT_FORMAT: Intl.NumberFormatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 2 };

export const CONTACT_PATH = "/community/contact";

/**
 * What the page shows for one energy-today answer (UI-TDY-004, UI-TDY-005):
 * each status, a zero or missing current power, and stale data map to their
 * designed state. A missing current power is not "not producing": it has its
 * own sentence, and neither shows a "Te llega ahora" figure.
 */
export function todayView(production: SupplyProductionTodayResponse): TodayView {
  switch (production.status) {
    case SupplyProductionTodayResponseStatus.NO_DATA_TODAY:
      return { kind: "withoutData", heroMode: "waiting", title: NO_DATA_TODAY_TITLE, text: NO_DATA_TODAY_TEXT, contactLink: null };
    case SupplyProductionTodayResponseStatus.NOT_AVAILABLE:
      return { kind: "withoutData", heroMode: "unavailable", title: NOT_AVAILABLE_TITLE, text: NOT_AVAILABLE_TEXT, contactLink: null };
    case SupplyProductionTodayResponseStatus.NO_COEFFICIENT_TODAY:
      return {
        kind: "withoutData",
        heroMode: "waiting",
        title: NO_COEFFICIENT_TITLE,
        text: NO_COEFFICIENT_TEXT,
        contactLink: CONTACT_PATH,
      };
    case SupplyProductionTodayResponseStatus.AVAILABLE:
      return availableView(production);
  }
}

function availableView(production: SupplyProductionTodayResponse): AvailableView {
  const lastUpdated = production.lastUpdatedAt ? formatTimeOfDay(production.lastUpdatedAt) : null;
  const stale = production.stale === true && lastUpdated !== null;
  const power = production.currentAssignedPowerKW;
  const energy = formatKilowattHours(production.assignedEnergyKWh ?? 0);
  const flowing = power !== null && power > 0;
  const beta = production.partitionCoefficient;

  let statusSentence: string;
  if (flowing) statusSentence = stale ? staleSentence(lastUpdated, formatKilowatts(power)) : flowingSentence(formatKilowatts(power));
  else if (power === null) statusSentence = noCurrentDataSentence(energy);
  else statusSentence = notProducingSentence(energy);

  return {
    kind: "available",
    heroMode: flowing ? "flowing" : "idle",
    powerKW: power,
    plantPowerKW: production.currentPlantPowerKW,
    lastUpdated,
    staleAt: stale ? lastUpdated : null,
    statusSentence,
    currentFigure: flowing ? { label: stale ? staleFigure(lastUpdated) : CURRENT_FIGURE, value: formatKilowatts(power) } : null,
    energyFigure: { label: ENERGY_FIGURE, value: energy },
    coefficientLine: beta === null || beta === 0 ? null : coefficientText(formatPercentage(beta, COEFFICIENT_FORMAT)),
    staleNotice: stale ? staleNotice(lastUpdated) : null,
    nowPowerKW: stale ? null : power,
    note: hasCurveGaps(production) ? `${INVERTER_NOTE} ${INVERTER_NOTE_GAPS}` : INVERTER_NOTE,
  };
}

/** Whether the assigned curve has a slot with no value: only then does the note speak of gaps (UI-TDY-005). */
export function hasCurveGaps(production: SupplyProductionTodayResponse): boolean {
  return (production.assignedPowerCurve ?? []).some((point) => point.powerKW === null);
}
