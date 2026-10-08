import { describe, expect, it } from "vitest";
import { colors } from "../../../theme/tokens";
import { ENERGY_COLORS, SAVINGS_COLOR } from "./energyColors";

/** WCAG 2.x contrast ratio between two "#rrggbb" colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((at) => {
      const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * How far apart in lightness two marks drawn side by side must be, so that a
 * reader who cannot tell their hues apart still tells them apart. The palette
 * was solved for about 2:1; this floor sits just below the closest pair.
 */
const SIDE_BY_SIDE_FLOOR = 1.9;

describe("energyColors (#231)", () => {
  it("maps each concept to its agreed token", () => {
    expect(ENERGY_COLORS).toEqual({
      community: colors.success.vivid,
      grid: colors.secondary.main,
      assigned: colors.accent.violet,
      exported: colors.accent.violetDeep,
      consumption: colors.accent.navy,
      bestHours: colors.success.surface,
    });
    expect(SAVINGS_COLOR).toBe(colors.accent.raspberry);
  });

  it("gives no two concepts the same colour, and lends none to the savings or the block chrome", () => {
    const concepts = Object.values(ENERGY_COLORS);

    expect(new Set(concepts).size).toBe(concepts.length);
    expect(concepts).not.toContain(SAVINGS_COLOR);
    expect(concepts).not.toContain(colors.brand.main);
  });

  it("draws every mark at 3:1 or more on the white card", () => {
    // The best-hours band is a tint behind the bars, not a mark: it repeats the lead in words.
    const marks = Object.entries({ ...ENERGY_COLORS, savings: SAVINGS_COLOR }).filter(([concept]) => concept !== "bestHours");

    for (const [concept, colour] of marks) {
      expect(contrast(colour, colors.background.paper), concept).toBeGreaterThanOrEqual(3);
    }
  });

  it.each([
    ["community | exported, in the first journey bar", ENERGY_COLORS.community, ENERGY_COLORS.exported],
    ["community | grid, in the second bar and the twelve months", ENERGY_COLORS.community, ENERGY_COLORS.grid],
    ["consumption | assigned, in the hourly chart", ENERGY_COLORS.consumption, ENERGY_COLORS.assigned],
    ["community energy above the savings, in the twelve-month block", ENERGY_COLORS.community, SAVINGS_COLOR],
  ])("separates %s by lightness, not only by hue", (_, a, b) => {
    expect(contrast(a, b)).toBeGreaterThanOrEqual(SIDE_BY_SIDE_FLOOR);
  });
});
