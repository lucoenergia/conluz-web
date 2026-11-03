import type { EstimatedPriceResponse } from "../../../api/models";
import { formatEurosPerKilowattHour } from "../../../utils/formatEnergyFigures";

/** The sentence stating the estimated price, shared by EstimatedPriceLabel and the period CSV's savings note. */
export function estimatedPriceText(estimatedPrice: EstimatedPriceResponse): string {
  return `Estimado con un precio de ${formatEurosPerKilowattHour(estimatedPrice.eurPerKWh)} para la energía, sin impuestos.`;
}
