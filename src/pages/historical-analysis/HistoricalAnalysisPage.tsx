import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";

/** "Mi consumo y ahorro": the caller's own supplies over time (#247). */
export const HistoricalAnalysisPage: FC = () => (
  <Box sx={{ ...sxStyles.pageContainer, p: { xs: 2, sm: 4 }, maxWidth: 960, display: "flex", flexDirection: "column", gap: 3 }}>
    <Typography variant="h4" component="h1" sx={{ color: colors.text.primary }}>
      Mi consumo y ahorro
    </Typography>
  </Box>
);
