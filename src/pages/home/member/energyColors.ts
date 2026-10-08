import { colors } from "../../../theme/tokens";

/**
 * The one place the member home chooses a colour for an energy concept (#231).
 * Each concept keeps its colour everywhere on the screen -- the journey bars,
 * both charts and every legend -- and no colour stands for two concepts.
 *
 * Every mark clears 3:1 on the white card, and community energy sits at that
 * floor (3.03:1), so every other mark is darker than it. Marks drawn side by
 * side differ in lightness, not only in hue, so a reader who cannot tell hues
 * apart still can:
 * - community | exported, in the first journey bar: 2.98:1
 * - community | grid, in the second bar and the twelve months: 2.50:1
 * - consumption | assigned, in the hourly chart: 2.95:1, and on opposite ends
 *   of the blue-yellow axis, which colour-blind readers keep: 2.31-3.22:1
 *   under protanopia, deuteranopia and tritanopia
 * - community energy above savings, in the twelve-month block: 1.98:1, and
 *   opposite hues
 *
 * The best-hours band is a tint (1.10:1): it only repeats the block's lead in
 * words.
 */
export const ENERGY_COLORS = {
  /** Community energy the member used. */
  community: colors.success.vivid,
  /** Energy bought from the grid. */
  grid: colors.secondary.main,
  /** Energy assigned to the member: sunlight gold, drawn only as marks. */
  assigned: colors.marks.gold,
  /** The part of the assigned energy that went to the grid unused. */
  exported: colors.accent.violetDeep,
  /** The member's consumption. Not a slate: slate means the grid. */
  consumption: colors.accent.navy,
  /** The best hours: those when the most assigned energy arrives. */
  bestHours: colors.success.surface,
} as const;

/**
 * What the member saved, in euros, wherever it appears: the month's amount,
 * the monthly bars and the payback. Not green, which is community energy's,
 * the series drawn right above the monthly savings.
 */
export const SAVINGS_COLOR = colors.accent.raspberry;

/** How a legend swatch, or a bar segment, draws one kind of mark. */
export interface SwatchStyle {
  bgcolor: string;
  border?: string;
}

export const swatch = {
  solid: (color: string): SwatchStyle => ({ bgcolor: color }),
  band: { bgcolor: ENERGY_COLORS.bestHours, border: `1px solid ${colors.success.main}` } satisfies SwatchStyle,
};
