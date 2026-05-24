import { type FC, type ReactNode } from "react";
import { CardContent, Typography, Box, Divider } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { AppCard } from "../AppCard";

export interface StatItem {
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon?: ReactNode;
  color?: string;
}

interface StatsCardProps {
  title: string;
  subtitle?: string;
  stats: StatItem[];
  icon?: ReactNode;
  accentColor?: string;
  variant?: "production" | "consumption" | "default";
}

export const StatsCard: FC<StatsCardProps> = ({
  title,
  subtitle,
  stats,
  icon,
  accentColor = "#1976d2",
  variant = "default",
}) => {
  // variant is reserved for future differentiation; all variants currently share the same look
  void variant;

  return (
    <AppCard
      header={
        <>
          <Box>
            <Typography variant="h6">{title}</Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: "50%",
                p: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </Box>
          )}
        </>
      }
    >
      <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Box
          sx={{
            display: "grid",
            gap: { xs: 2, sm: 3, md: 4 },
            gridTemplateColumns: {
              xs: "1fr",
              sm: stats.length > 2 ? "repeat(2, minmax(0, 1fr))" : "1fr",
              md:
                stats.length > 3
                  ? `repeat(${stats.length}, minmax(0, 1fr))`
                  : `repeat(${Math.min(stats.length, 3)}, minmax(0, 1fr))`,
            },
          }}
        >
          {stats.map((stat, index) => (
            <Box key={index} sx={{ textAlign: "center" }}>
              {stat.icon && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    mb: 2,
                    color: stat.color || accentColor,
                  }}
                >
                  {stat.icon}
                </Box>
              )}

              <Typography variant="h4" sx={{ color: stat.color || "#1e293b", mb: 0.5 }}>
                {stat.value}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {stat.label}
              </Typography>

              {stat.trend !== undefined && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  {stat.trend > 0 ? (
                    <TrendingUpIcon sx={{ fontSize: 16, color: "#10b981" }} />
                  ) : (
                    <TrendingDownIcon sx={{ fontSize: 16, color: "#ef4444" }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: stat.trend > 0 ? "#10b981" : "#ef4444",
                      fontWeight: 500,
                    }}
                  >
                    {Math.abs(stat.trend)}%
                    {stat.trendLabel && ` ${stat.trendLabel}`}
                  </Typography>
                </Box>
              )}

              {index < stats.length - 1 && stats.length <= 3 && (
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{
                    position: "absolute",
                    right: 0,
                    top: "20%",
                    height: "60%",
                    display: { xs: "none", sm: "block" },
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </AppCard>
  );
};
