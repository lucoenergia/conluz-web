import type { FC, ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { colors } from "../../theme/tokens";

/** One entry of a chart legend, as a list item: a swatch beside its label. */
export const LegendEntry: FC<{ swatch: ReactNode; label: string }> = ({ swatch, label }) => (
  <Box component="li" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
    {swatch}
    <Typography variant="caption" sx={{ color: colors.text.primary }}>
      {label}
    </Typography>
  </Box>
);
