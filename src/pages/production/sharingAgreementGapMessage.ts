import { COEFFICIENT_SCALE, formatCoefficientPercentage } from "./sharingAgreementCoefficientSums";

/**
 * Positive deltaMillionths (short of 100%) → "Faltan …"; negative (over 100%) → "Sobran …".
 * Zero → null (no gap to report).
 */
export function formatCoefficientGapMessage(deltaMillionths: number): string | null {
  if (deltaMillionths === 0) return null;

  const percentage = formatCoefficientPercentage(Math.abs(deltaMillionths) / COEFFICIENT_SCALE);
  return deltaMillionths > 0
    ? `Faltan ${percentage} para llegar al 100,0000 %.`
    : `Sobran ${percentage} sobre el 100,0000 %.`;
}
