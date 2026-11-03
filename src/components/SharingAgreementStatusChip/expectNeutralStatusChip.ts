import { expect } from "vitest";
import { colors } from "../../theme/tokens";
import { declaredStyleWithin } from "../../test/declaredStyle";

/** A "#rrggbb" token as the two forms a declaration may carry it in: hex, and the "r, g, b" of an rgb()/rgba(). */
const formsOf = (hex: string) => [
  hex.toLowerCase(),
  [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(", "),
];

/** Every warning and error tone the theme has. */
const FAILURE_TONES = [colors.warning, colors.error].flatMap((hue) => Object.values(hue).flatMap(formsOf));

/**
 * Asserts that a sharing agreement status chip is painted with no warning or
 * error tone (UI-AGR-016), for the spec files of every screen that renders it.
 *
 * Structural on purpose: the palette is the subject, and a palette has no role
 * or text. The chip is reached from its label (`closest(".MuiChip-root")`), and
 * its paint is read from the rules emotion wrote for it, its icon's included
 * (see declaredStyleWithin), because computed styles are blind to them here.
 */
export function expectNeutralStatusChip(label: HTMLElement) {
  const chip = label.closest<HTMLElement>(".MuiChip-root");
  expect(chip, "status chip").not.toBeNull();
  if (!chip) return;

  expect(chip.className).not.toMatch(/MuiChip-(colorWarning|colorError|outlinedWarning|outlinedError)/);

  const declarations = declaredStyleWithin(chip);
  // Never vacuous: a chip whose rules were not found would pass any palette.
  expect(declarations.some(([, property]) => property === "color"), "the chip's own colour declaration").toBe(true);
  expect(declarations.filter(([, , value]) => FAILURE_TONES.some((tone) => value.toLowerCase().includes(tone)))).toEqual([]);
}
