import type { MembershipEnergyMetricsCoverageResponse } from "../../../api/models";
import { formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { formatPercentage } from "../../../utils/formatPercentage";

/**
 * The one message the member home shows under the figures (#199): the rules,
 * their thresholds and their copy, kept together so tuning any of them is an
 * edit to this file alone.
 *
 * The copy is deliberate, so read this before rewording it:
 * - It never names an appliance. Not every member owns a given one, and naming
 *   it tells them it is expected of them.
 * - The low case says "si puedes". Some members only use their home at
 *   weekends or on holiday, where a low share is their life rather than a
 *   failure, and the data cannot tell them apart from someone who could shift
 *   their consumption.
 * - It speaks of energy only, never euros. Most exported energy was not
 *   recoverable, so pricing it would overstate what the member could have
 *   saved.
 * - It states facts without blame: "se fueron a la red sin que los usaras",
 *   not "que no usaste".
 */

/** Below this share of the assigned energy used, the message suggests shifting consumption. */
export const LOW_SELF_CONSUMPTION_RATIO = 0.3;
/** Above this share, the message only acknowledges how well it went. */
export const HIGH_SELF_CONSUMPTION_RATIO = 0.6;

/**
 * The least share of a month's expected hours with data for the month to be
 * compared with another (#200). Below half, a month's totals measure the
 * missing data more than what the member did, so any change would mislead;
 * from here up to a complete month the comparison is shown, but said to be
 * affected. A month with every hour recorded is compared even when nothing was
 * consumed: an empty house is data, not missing data.
 */
export const MIN_COMPARABLE_COVERAGE = 0.5;

export type MemberHomeMessage =
  /** The month has gaps: no advice, only a neutral notice. */
  | { kind: "partial-month"; text: string }
  | { kind: "advice"; text: string };

export interface MemberHomeMessageInput {
  coverage: MembershipEnergyMetricsCoverageResponse;
  /** Share of the assigned energy the member used, 0-1. */
  selfConsumptionRatio: number;
  surplusKWh: number;
}

/**
 * Whether the month has fewer hours, or fewer supplies, with data than it
 * should. Hourly coverage only: the monthly series counts supplies with data
 * per month from monthly records, which is not comparable and is never mixed
 * in here.
 */
export function isPartialMonth(coverage: MembershipEnergyMetricsCoverageResponse): boolean {
  return coverage.hoursWithData < coverage.expectedHours || coverage.suppliesWithData < coverage.supplyCount;
}

/** Whether a month has enough of its hours recorded to be compared with another. */
export function isComparableMonth({ hoursWithData, expectedHours }: MembershipEnergyMetricsCoverageResponse): boolean {
  return hoursWithData >= MIN_COMPARABLE_COVERAGE * expectedHours;
}

function partialMonthText({ supplyCount, suppliesWithData }: MembershipEnergyMetricsCoverageResponse): string {
  if (suppliesWithData < supplyCount) {
    const missing = supplyCount - suppliesWithData;
    return `Este mes está incompleto: no hay datos de ${missing} de tus ${supplyCount} puntos de suministro, así que las cifras son menores de lo que fueron en realidad.`;
  }
  return "Este mes está incompleto: faltan los datos de algunas horas, así que las cifras son menores de lo que fueron en realidad.";
}

const wholePercent = (ratio: number) => formatPercentage(ratio, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Picks the single message for the month, evaluating the rules in order. */
export function chooseMemberHomeMessage({
  coverage,
  selfConsumptionRatio,
  surplusKWh,
}: MemberHomeMessageInput): MemberHomeMessage {
  // Never advise on half a month's figures.
  if (isPartialMonth(coverage)) return { kind: "partial-month", text: partialMonthText(coverage) };

  const exported = formatKilowattHours(surplusKWh);
  const used = wholePercent(selfConsumptionRatio);

  if (selfConsumptionRatio < LOW_SELF_CONSUMPTION_RATIO) {
    return {
      kind: "advice",
      text: `De la energía que se te asignó, ${exported} se fueron a la red sin que los usaras. Si puedes usar los electrodomésticos de más consumo en las horas centrales del día, aprovecharás más.`,
    };
  }
  if (selfConsumptionRatio > HIGH_SELF_CONSUMPTION_RATIO) {
    return { kind: "advice", text: `Aprovechaste el ${used} de la energía que se te asignó. Vas muy bien.` };
  }
  return {
    kind: "advice",
    text: `Aprovechaste el ${used} de la energía que se te asignó. Los ${exported} restantes se fueron a la red; usar los electrodomésticos de más consumo en las horas centrales del día sube ese porcentaje.`,
  };
}
