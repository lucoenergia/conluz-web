import type { MembershipEnergyMetricsResponse } from "../../../api/models";
import { formatEuros } from "../../../utils/formatEnergyFigures";
import { formatPercentage } from "../../../utils/formatPercentage";
import { isComparableMonth, isPartialMonth } from "./memberHomeMessage";

/**
 * The comparison of the reference month with the month before it (#200): which
 * figures are compared, how each change is expressed, and its copy.
 *
 * - A ratio's change is in percentage points, never a relative percentage: a
 *   share going from 20 % to 30 % is ten points, not a 50 % rise.
 * - Savings change in euros. The month before can have saved 0,00 €, against
 *   which a relative change means nothing.
 * - A figure that is null in either month is not compared. Null means its
 *   denominator was zero, not that the figure was zero, so it is never read as
 *   0 %.
 * - The direction is stated in words. Whether a change is good is not for the
 *   comparison to say: a fall can come from the weather or from missing data.
 */

export type ChangeDirection = "up" | "down" | "same";

export type FigureComparison =
  | { label: string; kind: "compared"; current: string; previous: string; direction: ChangeDirection; change: string }
  /** Null in at least one month: nothing is computed. */
  | { label: string; kind: "not-compared"; reason: string };

export type MonthComparison =
  | { kind: "unavailable"; title: string; text: string }
  | {
      kind: "available";
      figures: FigureComparison[];
      /** Why the change may not reflect what the member did, or null when both months are complete. */
      affectedBy: string | null;
    };

export interface MonthComparisonInput {
  current: MembershipEnergyMetricsResponse;
  previous: MembershipEnergyMetricsResponse;
  /** The reference month, as the page names it: "agosto de 2026". */
  currentMonth: string;
  previousMonth: string;
}

const directionOf = (difference: number): ChangeDirection => (difference > 0 ? "up" : difference < 0 ? "down" : "same");

const moreOrLess = (direction: ChangeDirection) => (direction === "up" ? "más" : "menos");

/** The months a condition holds for, previous first: [] , ["julio de 2026"], or both. */
const monthsWhere = (entries: [boolean, string][]) => entries.filter(([holds]) => holds).map(([, month]) => month);

/** Names one month or both: "julio de 2026", "julio de 2026 y agosto de 2026". */
const months = (names: string[]) => names.join(" y ");

function compareFigure(
  label: string,
  current: number | null,
  previous: number | null,
  { currentMonth, previousMonth }: MonthComparisonInput,
  express: (current: number, previous: number) => Omit<Extract<FigureComparison, { kind: "compared" }>, "label" | "kind">,
): FigureComparison {
  if (current === null || previous === null) {
    const missing = monthsWhere([
      [previous === null, previousMonth],
      [current === null, currentMonth],
    ]);
    return { label, kind: "not-compared", reason: `Sin comparación: no hay dato de ${months(missing)}.` };
  }
  return { label, kind: "compared", ...express(current, previous) };
}

function compareEuros(current: number, previous: number, previousMonth: string) {
  // Both amounts are already rounded to the cent; round the difference so float noise never shows.
  const difference = Math.round((current - previous) * 100) / 100;
  const direction = directionOf(difference);
  return {
    current: formatEuros(current),
    previous: formatEuros(previous),
    direction,
    change:
      direction === "same" ? `Igual que en ${previousMonth}` : `${formatEuros(Math.abs(difference))} ${moreOrLess(direction)}`,
  };
}

/**
 * Percentage points between the whole percents the comparison shows, so the
 * figures on screen always add up: 45 % against 31 % is 14 points, whatever
 * decimals were rounded away.
 */
function comparePoints(current: number, previous: number, previousMonth: string) {
  const currentPercent = Math.round(current * 100);
  const previousPercent = Math.round(previous * 100);
  const points = currentPercent - previousPercent;
  const direction = directionOf(points);
  const magnitude = Math.abs(points);
  const unit = magnitude === 1 ? "punto porcentual" : "puntos porcentuales";
  return {
    current: formatPercentage(currentPercent / 100, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    previous: formatPercentage(previousPercent / 100, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    direction,
    change: direction === "same" ? `Igual que en ${previousMonth}` : `${magnitude} ${unit} ${moreOrLess(direction)}`,
  };
}

/** Compares the reference month with the month before it, or says why it cannot. */
export function compareWithPreviousMonth(input: MonthComparisonInput): MonthComparison {
  const { current, previous, currentMonth, previousMonth } = input;

  const tooIncomplete = monthsWhere([
    [!isComparableMonth(previous.coverage), previousMonth],
    [!isComparableMonth(current.coverage), currentMonth],
  ]);
  if (tooIncomplete.length > 0) {
    return {
      kind: "unavailable",
      title: "Todavía no se puede comparar con el mes anterior",
      text: `No hay datos suficientes de ${months(tooIncomplete)}. La comparación aparecerá cuando los dos meses tengan datos.`,
    };
  }

  const incomplete = monthsWhere([
    [isPartialMonth(previous.coverage), previousMonth],
    [isPartialMonth(current.coverage), currentMonth],
  ]);

  return {
    kind: "available",
    affectedBy:
      incomplete.length === 0
        ? null
        : `La comparación está afectada: faltan datos de ${months(incomplete)}, así que parte del cambio puede deberse a esos datos que faltan y no a tu consumo.`,
    figures: [
      compareFigure("Tu ahorro", current.savings.amountEur, previous.savings.amountEur, input, (c, p) =>
        compareEuros(c, p, previousMonth),
      ),
      compareFigure(
        "Energía asignada que usaste",
        current.selfConsumptionRatio,
        previous.selfConsumptionRatio,
        input,
        (c, p) => comparePoints(c, p, previousMonth),
      ),
      compareFigure(
        "Consumo cubierto por la comunidad",
        current.selfSufficiencyRatio,
        previous.selfSufficiencyRatio,
        input,
        (c, p) => comparePoints(c, p, previousMonth),
      ),
    ],
  };
}
