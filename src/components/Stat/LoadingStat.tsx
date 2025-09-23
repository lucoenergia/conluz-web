import { Skeleton, Typography } from "@mui/material";
import type { FC } from "react";

interface StatProps {
  label: string;
  variant?: "normal" | "big";
  className?: string;
}

export const LoadingStat: FC<StatProps> = ({ label, variant = "normal", className }) => {
  return (
    <div className={className}>
      <Typography className={variant === "normal" ? "font-semibold" : "font-light"}>{label}</Typography>
      <Typography className={variant === "normal" ? "text-sm font-light" : "text-2xl font-bold"}>
        <Skeleton />
      </Typography>
    </div>
  );
};
