import { describe, expect, it } from "vitest";
import { colors } from "../../../theme/tokens";
import { ENERGY_COLORS, SAVINGS_COLOR } from "./energyColors";

describe("energyColors (#231)", () => {
  it("maps each concept to its agreed token", () => {
    expect(ENERGY_COLORS).toEqual({
      community: colors.success.vivid,
      grid: colors.secondary.main,
      assigned: colors.accent.violet,
      consumption: colors.accent.blue,
      bestHours: colors.success.surface,
    });
    expect(SAVINGS_COLOR).toBe(colors.success.main);
  });

  it("gives no two concepts the same colour, and lends none to the savings or the block chrome", () => {
    const concepts = Object.values(ENERGY_COLORS);

    expect(new Set(concepts).size).toBe(concepts.length);
    expect(concepts).not.toContain(SAVINGS_COLOR);
    expect(concepts).not.toContain(colors.brand.main);
  });
});
