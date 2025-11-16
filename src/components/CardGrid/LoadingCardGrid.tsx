import type { FC } from "react";
import { Box, Paper, Skeleton } from "@mui/material";

export interface LoadingCardGridProps {
  skeletonCount?: number;
  gap?: number | { xs?: number; sm?: number };
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}

export const LoadingCardGrid: FC<LoadingCardGridProps> = ({
  skeletonCount = 6,
  gap = { xs: 2, sm: 3 },
  columns = {
    xs: 1,
    sm: 1,
    md: 2,
    lg: 3,
  },
}) => {
  const gridTemplateColumns = {
    xs: columns.xs ? `repeat(${columns.xs}, 1fr)` : "1fr",
    sm: columns.sm ? `repeat(${columns.sm}, 1fr)` : "1fr",
    md: columns.md ? `repeat(${columns.md}, 1fr)` : "repeat(2, 1fr)",
    lg: columns.lg ? `repeat(${columns.lg}, 1fr)` : "repeat(3, 1fr)",
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns,
        gap,
        width: "100%",
      }}
    >
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <Paper
          key={i}
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
          }}
        >
          <Skeleton variant="rectangular" height={120} />
          <Box sx={{ p: 2 }}>
            <Skeleton variant="text" sx={{ fontSize: "1.5rem" }} />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="60%" />
          </Box>
        </Paper>
      ))}
    </Box>
  );
};
