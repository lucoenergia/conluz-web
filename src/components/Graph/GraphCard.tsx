import { Typography } from "@mui/material";
import type { FC, ReactNode } from "react";
import { CardTemplate } from "../CardTemplate/CardTemplate";

interface GraphCardProps {
  title: string;
  infoText: string;
  children: ReactNode;
  className?: string;
}

export const GraphCard: FC<GraphCardProps> = ({ title, infoText, children, className }) => {
  return (
    <CardTemplate className={`${className} rounded-xl`}>
      <Typography className="font-bold font-black text-sm mt-3 mr-3 ml-3 mb-2">{title}</Typography>
      <Typography className="text-xs font-sx mr-3 ml-3">{infoText}</Typography>
      {children}
    </CardTemplate>
  );
};
