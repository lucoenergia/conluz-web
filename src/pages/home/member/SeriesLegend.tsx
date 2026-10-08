import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { colors, radii } from "../../../theme/tokens";
import type { SwatchStyle } from "./energyColors";

export interface LegendItem {
  label: string;
  swatch: SwatchStyle;
}

/**
 * A chart's legend, drawn outside the chart so it reads at any width without
 * scrolling the chart, and from the same colours the chart is given.
 */
export const SeriesLegend: FC<{ items: LegendItem[] }> = ({ items }) => (
  <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
    {items.map((item) => (
      <Box component="li" key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Box aria-hidden sx={{ width: 12, height: 12, borderRadius: radii.small, flexShrink: 0, boxSizing: "border-box", ...item.swatch }} />
        <Typography variant="body2" sx={{ color: colors.text.body }}>
          {item.label}
        </Typography>
      </Box>
    ))}
  </Box>
);
