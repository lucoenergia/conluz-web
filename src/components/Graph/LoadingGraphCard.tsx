import type { FC } from "react";
import { CardTemplate } from "../CardTemplate/CardTemplate";
import { Skeleton, Typography } from "@mui/material";

interface LoadingGraphCardProps {
  className?: string;
}

export const LoadingGraphCard: FC<LoadingGraphCardProps> = ({ className }) => {
  return (
    <CardTemplate className={`${className} rounded-xl`}>
      <Typography variant="body2" sx={{ fontWeight: 700 }} className="mt-3 mr-3 ml-3 mb-2">
        <Skeleton />
      </Typography>
      <Typography variant="caption" className="mr-3 ml-3">
        <Skeleton />
      </Typography>
      <Skeleton className="mx-2 h-50" />
    </CardTemplate>
  );
};
