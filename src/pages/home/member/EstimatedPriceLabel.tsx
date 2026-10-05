import type { FC } from "react";
import { Typography } from "@mui/material";
import type { EstimatedPriceResponse } from "../../../api/models";
import { formatEurosPerKilowattHour } from "../../../utils/formatEnergyFigures";
import { colors } from "../../../theme/tokens";

/**
 * States the estimated price a euro figure was computed with, as visible text.
 *
 * Keyed on `estimatedPrice` alone, never on `tariffSource`: the backend reports
 * ESTIMATE even where nothing was priced, so keying on it would print a price
 * beside an amount that has none. Each response carries its own price, and
 * each figure states the one from its own response.
 */
export const EstimatedPriceLabel: FC<{ estimatedPrice: EstimatedPriceResponse | null }> = ({ estimatedPrice }) => {
  if (estimatedPrice === null) return null;
  return (
    <Typography variant="caption" component="p" sx={{ color: colors.text.subtle }}>
      Estimado con un precio de {formatEurosPerKilowattHour(estimatedPrice.eurPerKWh)} para la energía, sin impuestos.
    </Typography>
  );
};
