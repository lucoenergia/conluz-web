import type { FC, ReactNode } from "react";
import { Box } from "@mui/material";

/**
 * A chart that needs more width than a narrow screen has scrolls inside this
 * area, so its axis is never squeezed and the page never scrolls sideways.
 */
export const ChartScrollArea: FC<{ minWidth: number; children: ReactNode }> = ({ minWidth, children }) => (
  <Box sx={{ overflowX: "auto" }}>
    <Box sx={{ minWidth }}>{children}</Box>
  </Box>
);
