import type { FC } from "react";
import { Box } from "@mui/material";
import { radii } from "../../theme/tokens";

/** A swatch beside a figure or a legend entry: gold is only ever a mark, never text (UI-PLT-013). */
export const Swatch: FC<{ bgcolor: string; border?: string; line?: boolean }> = ({ bgcolor, border, line = false }) => (
  <Box
    aria-hidden
    sx={{ width: line ? 2 : 12, height: 12, borderRadius: line ? 0 : radii.small, bgcolor, border, flexShrink: 0 }}
  />
);
