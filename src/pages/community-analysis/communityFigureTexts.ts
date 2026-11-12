import type { CommunityEnergyMetricsResponse } from "../../api/models";
import { formatKilowattHours } from "../../utils/formatEnergyFigures";
import { formatKilowatts, formatKilowattsPeak } from "../../utils/formatKilowatts";
import { formatPercentage } from "../../utils/formatPercentage";

// Words and figures shared by the sections of "Energía de la comunidad" (#403).

/** A figure the response leaves null: no data, never 0 (UI-CAN-003). */
export const NO_DATA = "Sin datos";

/** "58 %": a 0-1 ratio from the response, to the whole percent. */
export const wholePercent = (ratio: number) => formatPercentage(ratio, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** "53,3 %": a plant's 0-1 share of the production, to at most one decimal. */
export const sharePercent = (share: number) => formatPercentage(share, { minimumFractionDigits: 0, maximumFractionDigits: 1 });

export const kilowattHoursOrNoData = (value: number | null) => (value === null ? NO_DATA : formatKilowattHours(value));

export const PEAK_POWER_LABEL = "Potencia pico";
export const NOMINAL_POWER_LABEL = "Potencia nominal";

/** "Potencia pico 60 kWp · Potencia nominal 48 kW", both as the response gives them (UI-CAN-010). */
export const powersText = ({ peakPowerKWp, nominalPowerKW }: { peakPowerKWp: number; nominalPowerKW: number }) =>
  `${PEAK_POWER_LABEL} ${formatKilowattsPeak(peakPowerKWp)} · ${NOMINAL_POWER_LABEL} ${formatKilowatts(nominalPowerKW)}`;

/** What the header says about the plants: how many, and their peak and nominal power. */
export function plantsSummary(
  metrics: Pick<CommunityEnergyMetricsResponse, "plants" | "peakPowerKWp" | "nominalPowerKW">,
): string {
  const { plants } = metrics;
  if (plants.length === 0) return "sin plantas todavía";
  const count = plants.length === 1 ? "1 planta" : `${plants.length} plantas`;
  return `${count} · ${powersText(metrics)}`;
}

/** How many of the community's supplies the period's figures count (UI-CAN-004). */
export const coverageNotice = (suppliesWithData: number, supplyCount: number) =>
  `${suppliesWithData} de ${supplyCount} puntos de suministro tienen datos de este periodo. Las cifras pueden subir cuando lleguen los que faltan.`;

/** D1: the exported energy no market price covers, which the income leaves out (UI-CAN-005). */
export const unpricedSurplusText = (kWh: number) =>
  `${formatKilowattHours(kWh)} de energía que se fue a la red no tienen precio de mercado y no cuentan en el ingreso.`;

const yearList = new Intl.ListFormat("es", { type: "conjunction" });

/** The factor and the years applied to the CO₂ avoided (UI-CAN-006): "de 2024 y 2025". */
export const co2FactorText = (years: readonly number[]) =>
  `Calculado con el factor de emisión de MITECO para la electricidad sin garantía de origen de ${yearList.format(years.map(String))}.`;
