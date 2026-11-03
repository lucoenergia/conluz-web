import type { SlotView } from "./consumptionSeries";
import type { Granularity } from "./historicalPeriod";

/** Rows shown before "Ver todos". */
export const PAGE_SIZE = 7;

const UNIT = {
  daily: { one: "día", many: "días" },
  monthly: { one: "mes", many: "meses" },
} as const;

const unitOf = (count: number, granularity: Granularity) => (count === 1 ? UNIT[granularity].one : UNIT[granularity].many);

/**
 * The totals row's "Datos" cell: how many of the slots the energy-metrics
 * totals cover, by the same precedence as the slots, gap > partial > complete.
 * A measured zero is complete. Counts slots by state, never adds a figure.
 */
export function totalsStateText(slots: SlotView[], granularity: Granularity): string {
  const total = slots.length;
  const gaps = slots.filter((slot) => slot.state.kind === "gap").length;
  const partial = slots.filter((slot) => slot.state.kind === "partial").length;
  if (gaps > 0) return `Suma ${total - gaps} de ${total} ${unitOf(total, granularity)} con datos`;
  if (partial > 0) return `${total} de ${total} ${unitOf(total, granularity)} con datos; ${partial} ${partial === 1 ? "parcial" : "parciales"}`;
  return `${total} de ${total} ${unitOf(total, granularity)} ${total === 1 ? "completo" : "completos"}`;
}

/** "Mostrando 7 de 62 días.": the rows on screen out of the period's. */
export function showingText(shown: number, total: number, granularity: Granularity): string {
  return `Mostrando ${shown} de ${total} ${unitOf(total, granularity)}.`;
}
