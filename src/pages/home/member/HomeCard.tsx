import type { FC, ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { sxStyles } from "../../../theme/sx";
import { colors } from "../../../theme/tokens";

/** One block of the member home: a titled panel. */
export const HomeCard: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <Box component="section" aria-label={title} sx={{ ...sxStyles.softPanel, display: "flex", flexDirection: "column", gap: 1.5 }}>
    <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, color: colors.text.primary }}>
      {title}
    </Typography>
    {children}
  </Box>
);
