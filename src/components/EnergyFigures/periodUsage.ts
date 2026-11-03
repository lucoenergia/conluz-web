import { formatPercentage } from "../../utils/formatPercentage";

/**
 * The words the period card puts on the server's two ratios (#249). Pure, so
 * every boundary is table-tested: none of them may state a share the ratio
 * does not reach (UI-HIS-012).
 */

/**
 * Rounds half up, on the decimal the ratio was written as rather than on its
 * binary approximation: 0.995 × 100 is 99.49999999999999 in floating point,
 * and must still round to 100, as the percentage formatter rounds it.
 */
function roundHalfUp(value: number): number {
  return Math.floor(Number(value.toPrecision(12)) + 0.5);
}

const wholePercent = (ratio: number) => formatPercentage(ratio, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * A 0-1 ratio as a whole percentage that never claims a bound it does not
 * reach: above 0 never reads "0 %", below 1 never reads "100 %".
 */
export type BoundedPercent =
  | { kind: "belowOne"; text: string }
  | { kind: "almostAll"; text: string }
  | { kind: "exact"; text: string };

export function boundedPercent(ratio: number): BoundedPercent {
  const percent = roundHalfUp(ratio * 100);
  if (ratio > 0 && percent === 0) return { kind: "belowOne", text: `menos del ${wholePercent(0.01)}` };
  if (ratio < 1 && percent === 100) return { kind: "almostAll", text: `casi el ${wholePercent(1)}` };
  return { kind: "exact", text: wholePercent(ratio) };
}

/** The card's headline, from `selfConsumptionRatio`: "Usaste el 67 %". */
export function usageHeadline(selfConsumptionRatio: number): string {
  const share = boundedPercent(selfConsumptionRatio);
  return share.kind === "exact" ? `Usaste el ${share.text}` : `Usaste ${share.text}`;
}

/**
 * The consequence sentence, from `selfSufficiencyRatio`, split so the fraction
 * alone can be emphasised: `lead + fraction + tail` is the whole sentence.
 * Null when the ratio is: nothing was consumed, so there is nothing to cover.
 */
export interface CoverageSentence {
  lead: string;
  fraction: string | null;
  tail: string;
}

export function coverageSentence(selfSufficiencyRatio: number | null): CoverageSentence | null {
  const r = selfSufficiencyRatio;
  if (r === null) return null;
  if (r === 0) return { lead: "Tu consumo no se cubrió con energía de la comunidad", fraction: null, tail: "" };
  if (r === 1) return { lead: "Eso cubrió ", fraction: "todo", tail: " tu consumo" };
  const n = roundHalfUp(r * 10);
  if (n === 0) return { lead: "Eso cubrió ", fraction: "menos de 1 de cada 10 kWh", tail: " de tu consumo" };
  if (n === 10) return { lead: "Eso cubrió ", fraction: "casi todo", tail: " tu consumo" };
  return { lead: "Eso cubrió ", fraction: `${n} de cada 10 kWh`, tail: " de tu consumo" };
}

/** The sentence as one string. */
export function coverageText(sentence: CoverageSentence): string {
  return `${sentence.lead}${sentence.fraction ?? ""}${sentence.tail}`;
}

/** Under the detail line, when "Todos mis puntos" leaves plants' own supplies out of the headline. */
export function excludedPlantsText(count: number): string {
  return count === 1 ? "No incluye 1 punto de planta" : `No incluye ${count} puntos de planta`;
}

/** Above the card, when the selected supply is a plant's own supply. */
export function plantSupplyNotice(supplyName: string, plantName: string): string {
  return `${supplyName} es el punto de suministro de la planta ${plantName}: «se fue a la red» siempre es 0 kWh.`;
}
