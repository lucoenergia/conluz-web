import { type FC, type ReactNode } from "react";
import { Card, CardContent, Typography, Box, Divider } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

export interface StatItem {
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon?: ReactNode;
  color?: string;
}

interface EnhancedStatsCardProps {
  title: string;
  subtitle?: string;
  stats: StatItem[];
  icon?: ReactNode;
  accentColor?: string;
  variant?: "production" | "consumption" | "default";
}

export const EnhancedStatsCard: FC<EnhancedStatsCardProps> = ({
  title,
  subtitle,
  stats,
  icon,
  accentColor = "#1976d2",
  variant = "default",
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "production":
        return {
          background: "#667eea",
          iconBg: "rgba(255, 255, 255, 0.2)",
        };
      case "consumption":
        return {
          background: "#667eea",
          iconBg: "rgba(255, 255, 255, 0.2)",
        };
      default:
        return {
          background: "#667eea",
          iconBg: "rgba(255, 255, 255, 0.2)",
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Card
      sx={{
        width: "100%",
        borderRadius: 2,
        transition: "all 0.3s ease",
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.12)",
        overflow: "hidden",
        "&:hover": {
          boxShadow: "0 6px 24px 0 rgba(0,0,0,0.15)",
        },
      }}
    >
      <Box
        sx={{
          background: variantStyles.background,
          color: "white",
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="600">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              background: variantStyles.iconBg,
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
      </Box>

      <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Box
          sx={{
            display: "grid",
            gap: { xs: 2, sm: 3, md: 4 },
            gridTemplateColumns: {
              xs: "1fr",
              sm: stats.length > 2 ? "repeat(2, minmax(0, 1fr))" : "1fr",
              md: stats.length > 3 ? `repeat(${stats.length}, minmax(0, 1fr))` : `repeat(${Math.min(stats.length, 3)}, minmax(0, 1fr))`,
            },
          }}
        >
          {stats.map((stat, index) => (
            <Box key={index} className="text-center">
              {stat.icon && (
                <Box className="flex justify-center mb-2" sx={{ color: stat.color || accentColor }}>
                  {stat.icon}
                </Box>
              )}

              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{ color: stat.color || "#1e293b", mb: 0.5 }}
              >
                {stat.value}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {stat.label}
              </Typography>

              {stat.trend !== undefined && (
                <Box className="flex items-center justify-center gap-1">
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
    </Card>
  );
};