import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";

/** "Energía de la comunidad": the active community's energy over time, for every member (#403). */
export const CommunityAnalysisPage: FC = () => (
  <Box sx={{ ...sxStyles.pageContainer, p: { xs: 2, sm: 4 }, maxWidth: 960, display: "flex", flexDirection: "column", gap: 3 }}>
    <Typography variant="h4" component="h1" sx={{ color: colors.text.primary }}>
      Energía de la comunidad
    </Typography>
  </Box>
);
