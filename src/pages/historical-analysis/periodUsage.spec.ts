import { describe, expect, it } from "vitest";
import { coverageSentence, coverageText, usageHeadline } from "./periodUsage";

// Intl writes a no-break space before the percent sign.
const normalise = (text: string) => text.replace(/\s/g, " ");

describe("UI-HIS-012 the coverage sentence never states a share the ratio does not reach (#249)", () => {
  it("UI-HIS-012 a null ratio has no sentence", () => {
    expect(coverageSentence(null)).toBeNull();
  });

  it.each([
    [0, "Tu consumo no se cubrió con energía de la comunidad"],
    [0.04, "Eso cubrió menos de 1 de cada 10 kWh de tu consumo"],
    [0.05, "Eso cubrió 1 de cada 10 kWh de tu consumo"],
    [0.34, "Eso cubrió 3 de cada 10 kWh de tu consumo"],
    [0.35, "Eso cubrió 4 de cada 10 kWh de tu consumo"],
    [0.94, "Eso cubrió 9 de cada 10 kWh de tu consumo"],
    [0.95, "Eso cubrió casi todo tu consumo"],
    [0.999, "Eso cubrió casi todo tu consumo"],
    [1, "Eso cubrió todo tu consumo"],
  ])("UI-HIS-012 a ratio of %s reads %j", (ratio, expected) => {
    expect(coverageText(coverageSentence(ratio)!)).toBe(expected);
  });

  it("UI-HIS-011 only the fraction is set apart, and a ratio of 0 has none", () => {
    expect(coverageSentence(0.34)).toEqual({ lead: "Eso cubrió ", fraction: "3 de cada 10 kWh", tail: " de tu consumo" });
    expect(coverageSentence(0)!.fraction).toBeNull();
  });
});

describe("UI-HIS-012 the headline never states a share the ratio does not reach (#249)", () => {
  it.each([
    [0, "Usaste el 0 %"],
    [0.004, "Usaste menos del 1 %"],
    [0.005, "Usaste el 1 %"],
    [0.67, "Usaste el 67 %"],
    [0.994, "Usaste el 99 %"],
    [0.995, "Usaste casi el 100 %"],
    [0.999, "Usaste casi el 100 %"],
    [1, "Usaste el 100 %"],
  ])("UI-HIS-012 a ratio of %s reads %j", (ratio, expected) => {
    expect(normalise(usageHeadline(ratio))).toBe(expected);
  });
});
