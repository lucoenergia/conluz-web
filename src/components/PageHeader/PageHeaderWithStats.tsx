import type { FC } from "react";
import { Box, Paper, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

export interface StatItem {
  value: number;
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
  bgColor = "#667eea",
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: { xs: 0, sm: 3 },
        background: bgColor,
        color: "white",
        mx: { xs: 0, sm: 0 },
        width: { xs: "100%", sm: "auto" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Icon sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
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
              bgcolor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography
              variant="h3"
              fontWeight="bold"
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
