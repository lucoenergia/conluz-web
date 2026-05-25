import type { FC, ReactNode } from "react";
import { Box, Paper, Typography, Avatar } from "@mui/material";
import { alphas, radii } from "../../theme/tokens";
import type { SxProps, Theme } from "@mui/material";

// ─── DetailTile ──────────────────────────────────────────────────────────────
// Translucent overlay tile used inside both Plant and Supply detail headers.
// Encodes patterns #15 (overlay fill/blur/radius) and #3 (caption opacity 0.8).

export interface DetailTileProps {
  label: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export const DetailTile: FC<DetailTileProps> = ({ label, children, sx }) => (
  <Box
    sx={{
      bgcolor: alphas.white.subtle,
      backdropFilter: "blur(10px)",
      borderRadius: radii.default,
      p: 2,
      ...sx,
    }}
  >
    <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
      {label}
    </Typography>
    {children}
  </Box>
);

// ─── DetailHeader ─────────────────────────────────────────────────────────────
// Shared header shell for entity detail pages (Plant, Supply).
//
// Props that differ between the two headers are parameterised:
//   icon         — Avatar icon (SolarPowerIcon vs ElectricMeterIcon)
//   title        — Title-row ReactNode: Plant passes a plain <Typography h4 gutterBottom>;
//                  Supply passes a flex Box (with status Chip) — structural difference
//                  preserved so both render identically to before extraction.
//   subtitle     — Address string; DetailHeader applies opacity:0.9 (pattern #9).
//   children     — Grid tiles, shown only when !isLoading && !error.

export interface DetailHeaderProps {
  icon: ReactNode;
  title: ReactNode;
  subtitle: string;
  isLoading?: boolean;
  error?: unknown;
  children?: ReactNode;
}

export const DetailHeader: FC<DetailHeaderProps> = ({
  icon,
  title,
  subtitle,
  isLoading = false,
  error = null,
  children,
}) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 2, sm: 3 },
      borderRadius: { xs: 0, sm: radii.large },
      background: (theme) => theme.palette.primary.main,
      color: "white",
      mx: { xs: 0, sm: 0 },
      width: "100%",
      boxSizing: "border-box",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 3 }}>
      <Avatar
        sx={{
          bgcolor: alphas.white.soft,
          width: 56,
          height: 56,
        }}
      >
        {icon}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        {title}
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>

    {!isLoading && !error && (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        {children}
      </Box>
    )}
  </Paper>
);
