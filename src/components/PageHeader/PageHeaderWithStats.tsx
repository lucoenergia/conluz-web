import type { FC } from "react";
import { Box, Paper, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { colors, radii } from "../../theme/tokens";

export interface StatItem {
  value: number | string;
  label: string;
  color?: string;
}

export interface PageHeaderWithStatsProps {
  icon: SvgIconComponent;
  title: string;
  subtitle: string;
  stats: StatItem[];
  bgColor?: string;
}

export const PageHeaderWithStats: FC<PageHeaderWithStatsProps> = ({
  icon: Icon,
  title,
  subtitle,
  stats,
  bgColor = colors.brand.main,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: { xs: 0, sm: radii.large },
        background: bgColor,
        color: "white",
        mx: { xs: 0, sm: 0 },
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Icon sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.brand.onSoft }}>
            {subtitle}
          </Typography>
        </Box>
      </Box>

      {/* Statistics Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: `repeat(${stats.length}, 1fr)` },
          gap: 2,
          mt: 3,
        }}
      >
        {stats.map((stat, index) => (
          <Box
            key={index}
            sx={{
              // An explicit darker brand tone, not a white overlay: the old
              // rgba(255,255,255,.15) lifted the ground to ~#7D91ED, where the
              // status colours measured 1.16:1. Solid keeps contrast knowable.
              bgcolor: colors.brand.panel,
              borderRadius: radii.default,
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography
              variant="h3"
              component="p"
              sx={{ color: stat.color || colors.brand.contrastText }}
            >
              {stat.value}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.brand.onSoft }}>
              {stat.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
