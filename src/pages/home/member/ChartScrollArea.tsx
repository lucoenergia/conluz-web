import type { FC, ReactNode } from "react";
import { Box } from "@mui/material";

/**
 * A chart that needs more width than a narrow screen has scrolls inside this
 * area, so its axis is never squeezed and the page never scrolls sideways.
 */
export const ChartScrollArea: FC<{ minWidth: number; children: ReactNode }> = ({ minWidth, children }) => (
  <Box sx={{ overflowX: "auto" }}>
    <Box
      sx={{
        minWidth,
        // An inline SVG sits on a text baseline, and the gap below it pushes the
        // chart's hidden hover chrome one pixel past the room ApexCharts keeps
        // under the chart: enough to give this area a vertical scrollbar (#220).
        "& .apexcharts-svg": { display: "block" },
      }}
    >
      {children}
    </Box>
  </Box>
);
