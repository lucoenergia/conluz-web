import type { FC, ReactNode } from "react";
import { Box, Fade, Grow } from "@mui/material";

export interface EnhancedCardGridProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => ReactNode;
  getKey: (item: T) => string | number;
  gap?: number | { xs?: number; sm?: number };
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  animationDelay?: number;
  fadeTimeout?: number;
}

export const EnhancedCardGrid = <T,>({
  items,
  renderCard,
  getKey,
  gap = { xs: 2, sm: 3 },
  columns = {
    xs: 1,
    sm: 1,
    md: 2,
    lg: 3,
  },
  animationDelay = 50,
  fadeTimeout = 500,
}: EnhancedCardGridProps<T>): ReturnType<FC> => {
  const gridTemplateColumns = {
    xs: columns.xs ? `repeat(${columns.xs}, 1fr)` : "1fr",
    sm: columns.sm ? `repeat(${columns.sm}, 1fr)` : "1fr",
    md: columns.md ? `repeat(${columns.md}, 1fr)` : "repeat(2, 1fr)",
    lg: columns.lg ? `repeat(${columns.lg}, 1fr)` : "repeat(3, 1fr)",
  };

  return (
    <Fade in timeout={fadeTimeout}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns,
          gap,
          width: "100%",
        }}
      >
        {items.map((item, index) => (
          <Grow in timeout={300 + index * animationDelay} key={getKey(item)}>
            <Box>{renderCard(item, index)}</Box>
          </Grow>
        ))}
      </Box>
    </Fade>
  );
};
