import { describe, expect, it } from "vitest";
import { estimatedPriceText } from "./estimatedPriceText";

describe("UI-HOM-016 the estimate sentence states the energy price with VAT and electricity tax on top (#443)", () => {
  it.each([
    [0.15, "Estimado con un precio de 0,15 €/kWh para la energía, más IVA e impuesto eléctrico."],
    [0.1234, "Estimado con un precio de 0,1234 €/kWh para la energía, más IVA e impuesto eléctrico."],
  ])("UI-HOM-016 a price of %s €/kWh gives the exact sentence", (eurPerKWh, sentence) => {
    expect(estimatedPriceText({ eurPerKWh })).toBe(sentence);
  });
});
