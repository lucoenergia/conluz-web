import type { FC } from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";

type FontSize = "0.875rem" | "1rem" | "1.125rem" | "1.25rem" | "1.5rem";

interface LabeledIconProps {
  icon: SvgIconComponent;
  iconPosition?: "left" | "right";
  justify?: "start" | "end" | "between";
  label: string;
  variant?: "normal" | "compact";
  labelSize?: FontSize;
}

const justifyMap: Record<NonNullable<LabeledIconProps["justify"]>, string> = {
  start: "flex-start",
  end: "flex-end",
  between: "space-between",
};

export const LabeledIcon: FC<LabeledIconProps> = ({
  label,
  icon: Icon,
  iconPosition = "left",
  justify = "start",
  variant = "normal",
  labelSize = "1rem",
}) => {
  return (
    <Box
      sx={{
        display: "grid",
        gridAutoFlow: "column",
        gridAutoColumns: "max-content",
        width: "100%",
        justifyContent: justifyMap[justify],
        alignItems: "center",
        gap: 1,
        p: variant === "normal" ? 1 : 0,
      }}
    >
      {iconPosition === "left" && <Icon sx={{ fontSize: labelSize }} />}
      <Typography sx={{ fontSize: labelSize }}>{label}</Typography>
      {iconPosition === "right" && <Icon sx={{ fontSize: labelSize }} />}
    </Box>
  );
};
