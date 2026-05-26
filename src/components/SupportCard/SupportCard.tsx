import type { SvgIconComponent } from "@mui/icons-material";
import type { FC, ReactNode } from "react";
import { Card } from "@mui/material";
import { LabeledIcon } from "../LabeledIcon/LabeledIcon";

interface SupportCardProps {
  children: ReactNode;
  label: string;
  icon: SvgIconComponent;
}

export const SupportCard: FC<SupportCardProps> = ({ children, label, icon }) => {
  return (
    <Card
      sx={{
        p: 2,
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        alignItems: "center",
      }}
    >
      <LabeledIcon label={label} labelSize="1.5rem" icon={icon} />
      {children}
    </Card>
  );
};
