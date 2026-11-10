import type { FC, ReactNode } from "react";
import { Box } from "@mui/material";

/**
 * A chart that needs more width than a narrow screen has scrolls inside this
 * area, so its axis is never squeezed and the page never scrolls sideways.
 *
 * It never scrolls vertically (#220). With overflow-y left to compute to auto,
 * any vertical overflow showed a scrollbar that narrowed the area; ApexCharts
 * watches its parent's size and redrew at the new width, which moved its hover
 * chrome, which removed the scrollbar and widened the area again: a redraw loop
 * for as long as the pointer stayed on the chart. Hidden, the area's width no
 * longer depends on its content's height. It also clips, so nothing may
 * overflow downward: the layout budgets measure that there is nothing to clip.
 */
export const ChartScrollArea: FC<{ minWidth: number; children: ReactNode }> = ({ minWidth, children }) => (
  <Box sx={{ overflowX: "auto", overflowY: "hidden" }}>
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
