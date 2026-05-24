import type { FC } from "react";
import { Card, Skeleton, Typography } from "@mui/material";

interface LoadingGraphCardProps {
  className?: string;
}

export const LoadingGraphCard: FC<LoadingGraphCardProps> = ({ className }) => {
  return (
    <Card className={className}>
      <Typography variant="body2" sx={{ fontWeight: 700, mt: 1.5, mx: 1.5, mb: 1 }}>
        <Skeleton />
      </Typography>
      <Typography variant="caption" sx={{ mx: 1.5 }}>
        <Skeleton />
      </Typography>
      <Skeleton sx={{ mx: 1 }} />
    </Card>
  );
};
