import type { SvgIconComponent } from "@mui/icons-material";
import type { FC, ReactNode } from "react";
import { CardTemplate } from "../CardTemplate/CardTemplate";
import { LabeledIcon } from "../LabeledIcon/LabeledIcon";

interface SupportCardProps {
  children: ReactNode;
  label: string;
  icon: SvgIconComponent;
}

export const SupportCard: FC<SupportCardProps> = ({ children, label, icon }) => {
  return (
    <CardTemplate className="p-4 grid grid-cols-2 md:grid-cols-4 items-center">
      <LabeledIcon label={label} labelSize="text-2xl" icon={icon} />
      {children}
    </CardTemplate>
  );
};
