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
      <Typography sx={{ fontWeight: variant === "normal" ? 600 : 300 }}>{label}</Typography>
      <Typography variant={variant === "normal" ? "body2" : "h5"} sx={variant === "normal" ? { fontWeight: 300 } : undefined}>
        <Skeleton />
      </Typography>
    </div>
  );
};
