import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { colors } from "../../../theme/tokens";
import { formatPercentageOrNone, isImpossibleUnexplainedShare } from "./observedSharingFormat";

const IMPOSSIBLE_SHARE_WARNING =
  "Imposible: los puntos reciben más energía de la que produce la planta. Algún dato de Datadis es erróneo; revisa las anomalías con β observada muy alta.";

/**
 * "Sin explicar (1 − Σβ)" as the analysis gave it. An impossible one is still
 * shown, in the warning tone (UI-AGR-039).
 */
export const UnexplainedShareValue: FC<{ unallocated: number | null | undefined }> = ({ unallocated }) => (
  <Box
    component="span"
    sx={{
      fontVariantNumeric: "tabular-nums",
      ...(isImpossibleUnexplainedShare(unallocated) && { color: colors.warning.main }),
    }}
  >
    {formatPercentageOrNone(unallocated, 1)}
  </Box>
);

/** Under an impossible unexplained share, why it cannot be and where to look (UI-AGR-039); nothing otherwise. */
export const ImpossibleShareWarning: FC<{ unallocated: number | null | undefined }> = ({ unallocated }) =>
  isImpossibleUnexplainedShare(unallocated) ? (
    <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 400 }}>
      {IMPOSSIBLE_SHARE_WARNING}
    </Typography>
  ) : null;
