import { describe, expect, it } from "vitest";
import { formatCoefficientGapMessage } from "./sharingAgreementGapMessage";

describe("formatCoefficientGapMessage", () => {
  it("returns null when the sum is exactly full", () => {
    expect(formatCoefficientGapMessage(0)).toBeNull();
  });

  // formatCoefficientPercentage's Intl output uses a non-breaking space before its own
  // "%", spelled out below as an explicit \u00A0 escape (see formatPercentage.spec.ts).
  it("returns a 'Faltan' sentence for a positive delta (sum short of 100%)", () => {
    expect(formatCoefficientGapMessage(50_000)).toBe("Faltan 5,0000\u00A0% para llegar al 100,0000 %.");
  });

  it("returns a 'Sobran' sentence for a negative delta (sum over 100%)", () => {
    expect(formatCoefficientGapMessage(-100_000)).toBe("Sobran 10,0000\u00A0% sobre el 100,0000 %.");
  });

  it("formats a tiny gap (1 unit) without collapsing to 0", () => {
    expect(formatCoefficientGapMessage(1)).toBe("Faltan 0,0001\u00A0% para llegar al 100,0000 %.");
  });
});
