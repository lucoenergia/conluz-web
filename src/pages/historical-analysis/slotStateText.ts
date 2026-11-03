import type { SlotState } from "./consumptionSeries";
import type { Granularity } from "./historicalPeriod";

/** The tooltip's status line of a complete slot, and of a measured zero, whose figures say "medido". */
export const COMPLETE_TEXT = "Datos completos.";

export interface SlotStateText {
  /** The charts' tooltip status line (#250). */
  long: string;
}

/**
 * The words for every state a slot can be in, the one place they are written.
 * Each state is one entry, so every form of it is read from the same place.
 */
const SLOT_STATE_TEXT: {
  [Kind in SlotState["kind"]]: (state: Extract<SlotState, { kind: Kind }>, granularity: Granularity) => SlotStateText;
} = {
  gap: (_state, granularity) => ({
    long: `Sin datos: no hay lecturas de este ${granularity === "daily" ? "día" : "mes"}. No cuenta como 0.`,
  }),
  partial: ({ reported, total }) => ({
    long: `Datos parciales: ${reported} de ${total} puntos con datos.`,
  }),
  measuredZero: () => ({
    long: COMPLETE_TEXT,
  }),
  complete: () => ({
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
