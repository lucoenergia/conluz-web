import { describe, expect, it } from "vitest";
import { colors } from "../../../theme/tokens";
import { ENERGY_COLORS, SAVINGS_COLOR } from "./energyColors";

/** sRGB channel to linear light. */
const linear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

/** WCAG 2.x contrast ratio between two "#rrggbb" colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((at) => linear(parseInt(hex.slice(at, at + 2), 16) / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Machado, Oliveira and Fernandes (2009), full severity: how a colour appears
 * to a reader with each form of dichromacy. Applied in linear RGB.
 */
const COLOUR_VISION = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
} as const;

function simulate(hex: string, matrix: readonly (readonly number[])[]): string {
  const rgb = [1, 3, 5].map((at) => linear(parseInt(hex.slice(at, at + 2), 16) / 255));
  const encode = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    const srgb = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(srgb * 255).toString(16).padStart(2, "0");
  };
  return `#${matrix.map((row) => encode(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])).join("")}`;
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
      assigned: colors.marks.gold,
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

  it("draws the hourly bars at 3:1 or more on the best-hours band too, where they also sit", () => {
    expect(contrast(ENERGY_COLORS.assigned, ENERGY_COLORS.bestHours)).toBeGreaterThanOrEqual(3);
    expect(contrast(ENERGY_COLORS.consumption, ENERGY_COLORS.bestHours)).toBeGreaterThanOrEqual(3);
  });

  it.each(Object.keys(COLOUR_VISION))(
    "keeps consumption and assigned energy apart for a reader with %s",
    (kind) => {
      const simulated = (hex: string) => simulate(hex, COLOUR_VISION[kind as keyof typeof COLOUR_VISION]);

      expect(contrast(simulated(ENERGY_COLORS.consumption), simulated(ENERGY_COLORS.assigned))).toBeGreaterThanOrEqual(2);
    },
  );

  it.each([
    ["community | exported, in the first journey bar", ENERGY_COLORS.community, ENERGY_COLORS.exported],
    ["community | grid, in the second bar and the twelve months", ENERGY_COLORS.community, ENERGY_COLORS.grid],
    ["consumption | assigned, in the hourly chart", ENERGY_COLORS.consumption, ENERGY_COLORS.assigned],
    ["community energy above the savings, in the twelve-month block", ENERGY_COLORS.community, SAVINGS_COLOR],
  ])("separates %s by lightness, not only by hue", (_, a, b) => {
    expect(contrast(a, b)).toBeGreaterThanOrEqual(SIDE_BY_SIDE_FLOOR);
  });
});
