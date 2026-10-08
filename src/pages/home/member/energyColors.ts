import { colors } from "../../../theme/tokens";

/**
 * The one place the member home chooses a colour for an energy concept (#231).
 * Each concept keeps its colour everywhere on the screen -- the journey bars,
 * both charts and every legend -- and no colour stands for two concepts.
 *
 * Contrast against the white card each sits on: community 3.03:1, grid
 * 7.58:1, assigned 4.96:1, consumption 4.93:1. The best-hours band is a tint
 * (1.10:1): it only repeats what the block's lead states in words.
 *
 * Consumption is not a slate: grid energy is, and a member who reads slate as
 * "from the grid" in one chart must not read it as "your consumption" in the
 * next. Beside assigned energy it is told apart by being hollow, since the two
 * hues are close in lightness.
 */
export const ENERGY_COLORS = {
  /** Community energy the member used. */
  community: colors.success.vivid,
  /** Energy bought from the grid. */
  grid: colors.secondary.main,
  /** Energy assigned to the member; its exported part is the same hue, striped. */
  assigned: colors.accent.violet,
  /** The member's consumption, drawn hollow. */
  consumption: colors.accent.blue,
  /** The hours when assigned energy exceeds consumption. */
  bestHours: colors.success.surface,
} as const;

/** What the member saved, in euros: a gain, not an energy flow. */
export const SAVINGS_COLOR = colors.success.main;

/**
 * The part of the assigned energy that went to the grid unused: the assigned
 * hue in stripes over white. Half of it is white, so the 4.96:1 is the
 * stripe's, not the fill's; the segment's meaning rests on its own label.
 */
export const EXPORTED_FILL = `repeating-linear-gradient(135deg, ${ENERGY_COLORS.assigned} 0 2px, ${colors.background.paper} 2px 5px)`;

/** How a legend swatch, or a bar segment, draws one kind of mark. */
export interface SwatchStyle {
  bgcolor: string;
  backgroundImage?: string;
  border?: string;
}

export const swatch = {
  solid: (color: string): SwatchStyle => ({ bgcolor: color }),
  hollow: (color: string): SwatchStyle => ({ bgcolor: colors.background.paper, border: `2px solid ${color}` }),
  exported: { bgcolor: colors.background.paper, backgroundImage: EXPORTED_FILL } satisfies SwatchStyle,
  band: { bgcolor: ENERGY_COLORS.bestHours, border: `1px solid ${colors.success.main}` } satisfies SwatchStyle,
};
