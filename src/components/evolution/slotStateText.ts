import type { SlotState } from "./consumptionSeries";
import type { Granularity } from "../period/historicalPeriod";

/** The tooltip's status line of a complete slot, and of a measured zero, whose figures say "medido". */
export const COMPLETE_TEXT = "Datos completos.";

export interface SlotStateText {
  /** The data table's "Datos" cell and the CSV's `datos` column (#251). */
  short: string;
  /** The charts' tooltip status line (#250). */
  long: string;
}

/** A slot named as the one at hand: "hora" is feminine. */
const THIS_SLOT: Readonly<Record<Granularity, string>> = { hourly: "esta hora", daily: "este día", monthly: "este mes" };

/**
 * The words for every state a slot can be in, the one place they are written.
 * Each state is one entry, so every form of it is read from the same place.
 */
const SLOT_STATE_TEXT: {
  [Kind in SlotState["kind"]]: (state: Extract<SlotState, { kind: Kind }>, granularity: Granularity) => SlotStateText;
} = {
  gap: (_state, granularity) => ({
    short: "Sin datos",
    long: `Sin datos: no hay lecturas de ${THIS_SLOT[granularity]}. No cuenta como 0.`,
  }),
  partial: ({ reported, total }) => ({
    short: `Parcial: ${reported} de ${total} puntos con datos`,
    long: `Datos parciales: ${reported} de ${total} puntos con datos.`,
  }),
  measuredZero: () => ({
    short: "Cero medido",
    long: COMPLETE_TEXT,
  }),
  complete: () => ({
    short: "Completo",
    long: COMPLETE_TEXT,
  }),
};

/** The words for a slot's state. */
export function slotStateText(state: SlotState, granularity: Granularity): SlotStateText {
  switch (state.kind) {
    case "gap":
      return SLOT_STATE_TEXT.gap(state, granularity);
    case "partial":
      return SLOT_STATE_TEXT.partial(state, granularity);
    case "measuredZero":
      return SLOT_STATE_TEXT.measuredZero(state, granularity);
    case "complete":
      return SLOT_STATE_TEXT.complete(state, granularity);
  }
}
