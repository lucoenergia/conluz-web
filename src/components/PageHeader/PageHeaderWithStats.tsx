import type { FC } from "react";
import { Box, Paper, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { colors, radii, alphas } from "../../theme/tokens";

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
          <Typography variant="h4">
            {title}
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
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
              bgcolor: alphas.white.subtle,
              backdropFilter: "blur(10px)",
              borderRadius: radii.default,
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography
              variant="h3"
              sx={{ color: stat.color || "inherit" }}
            >
              {stat.value}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {stat.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
