import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { colors, radii, shadows, fontSizes } from "../../theme/tokens";

export interface PlatformKpiCardProps {
  /** Uppercase muted label, e.g. "Comunidades". */
  label: string;
  /** The headline number. */
  value: string | number;
  /** Small muted caption under the number. */
  sublabel: string;
}

/**
 * Light KPI card for the platform dashboard: uppercase muted label (fixed
 * min-height so single- and two-line labels stay aligned across the row), a
 * large 700-weight number (Typography h4), and a muted caption.
 */
export const PlatformKpiCard: FC<PlatformKpiCardProps> = ({ label, value, sublabel }) => (
  <Box
    sx={{
      bgcolor: "white",
      boxShadow: shadows.soft,
      borderRadius: radii.default,
      p: { xs: 2, sm: 3 },
      // No explicit height: the grid stretches cards to equal height via
      // align-items: stretch. A height:100% here causes a cyclic grid-track
      // sizing bug where content overflows the resolved track height.
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Typography
      component="p"
      sx={{
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        fontSize: fontSizes.xs,
        fontWeight: 600,
        color: colors.text.secondary,
        minHeight: 32,
      }}
    >
      {label}
    </Typography>
    <Typography variant="h4" sx={{ color: colors.text.primary, my: 0.5 }}>
      {value}
    </Typography>
    <Typography variant="body2" sx={{ color: colors.text.secondary }}>
      {sublabel}
    </Typography>
  </Box>
);
