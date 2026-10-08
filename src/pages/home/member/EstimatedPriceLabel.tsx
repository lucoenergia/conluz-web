import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { EstimatedPriceResponse } from "../../../api/models";
import { formatEurosPerKilowattHour } from "../../../utils/formatEnergyFigures";
import { colors, radii } from "../../../theme/tokens";

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
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0.75,
        alignSelf: "flex-start",
        px: 1.25,
        py: 0.75,
        borderRadius: radii.default,
        bgcolor: colors.background.surface,
        color: colors.text.body,
      }}
    >
      <InfoOutlinedIcon aria-hidden sx={{ fontSize: 16, mt: 0.25 }} />
      <Typography variant="caption" component="p" sx={{ color: colors.text.body }}>
        Estimado con un precio de {formatEurosPerKilowattHour(estimatedPrice.eurPerKWh)} para la energía, sin impuestos.
      </Typography>
    </Box>
  );
};
