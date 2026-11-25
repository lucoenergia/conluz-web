import type {
  CoefficientDatesEffectsResponse,
  NeighbourChangeResponse,
  AgreementStatusChangeResponse,
} from "../../../api/models";
import { formatCalendarDate } from "../../../utils/formatCalendarDate";
import { pluralize } from "../../../utils/pluralize";
import { supplyDisplayLabel } from "../../../utils/supplyDisplayLabel";
import { localDateAt } from "../../../utils/zonedTime";
import { getSharingAgreementStatusLabel } from "../sharingAgreementStatus";

const NUMERIC_DATE: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };

/** An instant the effects carry, as the day it names in Madrid: "01/02/2024". */
export const formatEffectDay = (instant: string) => formatCalendarDate(instant, NUMERIC_DATE);

/** A period of the effects, its end exclusive (UI-AGR-019): "01/02/2024 – 23/05/2024", or "– en curso" when open. */
export function formatEffectPeriod(from: string, to: string | null): string {
  return `${formatEffectDay(from)} – ${to ? formatEffectDay(to) : "en curso"}`;
}

/** An end as the effects report it: a day, or "en curso" when open. */
export const formatEffectEnd = (instant: string | null) => (instant ? formatEffectDay(instant) : "en curso");

/**
 * Whether a date the effects place falls before the day the agreement's file
 * was sent (UI-AGR-034). The response carries no such warning; this compares
 * two days the backend gave, it infers none.
 */
export function isBeforeSentDate(instant: string, distributorFileSentOn: string | null | undefined): boolean {
  return !!distributorFileSentOn && localDateAt(instant) < distributorFileSentOn;
}

/** The neighbours whose end moves, by the supply they belong to. */
export function neighboursBySupply(neighbours: NeighbourChangeResponse[]): Map<string, NeighbourChangeResponse[]> {
  const bySupply = new Map<string, NeighbourChangeResponse[]>();
  for (const neighbour of neighbours) {
    bySupply.set(neighbour.supply.id, [...(bySupply.get(neighbour.supply.id) ?? []), neighbour]);
  }
  return bySupply;
}

/**
 * How many supplies leave the distribution: those closed for being absent
 * from the agreement, and those whose coefficient drops to 0 %, as the
 * backend flags them (`leavesDistribution`); never inferred from a value.
 */
export const leavingSupplyCount = (effects: CoefficientDatesEffectsResponse) =>
  effects.leavingClosures.length + effects.coefficients.filter((row) => row.leavesDistribution).length;

/** The agreements whose status the request changes; one whose status stays is no change. */
export const statusChanges = (effects: CoefficientDatesEffectsResponse): AgreementStatusChangeResponse[] =>
  effects.agreementStatuses.filter((change) => change.statusBefore !== change.statusAfter);

/** "Reparto 2023: Vigente → Histórico". */
export const formatStatusChange = (change: AgreementStatusChangeResponse) =>
  `${change.sharingAgreement.name}: ${getSharingAgreementStatusLabel(change.statusBefore)} → ${getSharingAgreementStatusLabel(change.statusAfter)}`;

/** Whether the community's start date moves, which moves every member's payback (UI-AGR-034). */
export const communityStartChanges = (effects: CoefficientDatesEffectsResponse) =>
  effects.communityStart.before !== effects.communityStart.after && effects.communityStart.after !== null;

/** "La fecha de inicio de la comunidad pasa del 23/05/2024 al 05/04/2023." */
export function formatCommunityStartChange(effects: CoefficientDatesEffectsResponse): string {
  const { before, after } = effects.communityStart;
  if (!after) return "";
  return before
    ? `La fecha de inicio de la comunidad pasa del ${formatEffectDay(before)} al ${formatEffectDay(after)}.`
    : `La fecha de inicio de la comunidad pasa a ser el ${formatEffectDay(after)}.`;
}

/** Counts by a key, in the order each key first appears. */
function countBy<T>(items: T[], key: (item: T) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts];
}

/**
 * What a write changed, one sentence per kind of effect, from the response as
 * written (UI-AGR-035): never from the preview, which may differ.
 */
export function writtenEffectSentences(effects: CoefficientDatesEffectsResponse): string[] {
  const sentences: string[] = [];

  if (effects.coefficients.length > 0) {
    const n = effects.coefficients.length;
    const byDay = countBy(effects.coefficients, (row) => formatEffectDay(row.validFromAfter));
    const days =
      byDay.length === 1
        ? `desde el ${byDay[0][0]}`
        : byDay.map(([day, count]) => `${count} desde el ${day}`).join(", ").replace(/, ([^,]*)$/, " y $1");
    sentences.push(
      `${n} ${pluralize(n, "coeficiente tiene", "coeficientes tienen")} ya fecha de aplicación: ${days}.`,
    );
  }

  for (const [key, count] of countBy(
    effects.neighbours,
    (row) => JSON.stringify([row.sharingAgreement.name, row.validToAfter]),
  )) {
    const [agreementName, end] = JSON.parse(key) as [string, string | null];
    sentences.push(
      end
        ? `${count} ${pluralize(count, "coeficiente", "coeficientes")} de ${agreementName} ${pluralize(count, "termina", "terminan")} ahora el ${formatEffectDay(end)}.`
        : `${count} ${pluralize(count, "coeficiente", "coeficientes")} de ${agreementName} ${pluralize(count, "queda", "quedan")} sin fecha de fin.`,
    );
  }

  for (const closure of effects.leavingClosures) {
    sentences.push(
      `${supplyDisplayLabel(closure.supply)} sale del reparto: su coeficiente se ha cerrado el ${formatEffectDay(closure.validToAfter)}.`,
    );
  }

  for (const row of effects.coefficients.filter((coefficient) => coefficient.leavesDistribution)) {
    sentences.push(
      `${supplyDisplayLabel(row.supply)} sale del reparto: su coeficiente pasa a 0 % desde el ${formatEffectDay(row.validFromAfter)}.`,
    );
  }

  for (const change of statusChanges(effects)) sentences.push(`${formatStatusChange(change)}.`);

  if (communityStartChanges(effects)) sentences.push(formatCommunityStartChange(effects));

  return sentences;
}
