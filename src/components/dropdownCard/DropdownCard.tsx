import { type FC, type ReactNode } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface DropdownCardProps {
  className?: string,
  title: string,
  children: ReactNode
}

export const DropdownCard: FC<DropdownCardProps> = ({title, className, children}) => {
  return (
    <Accordion className={`rounded p-2 ${className}`}>
      <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
        <Typography className="text-2xl font-bold">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails className="grid gap-4">
        {children}
      </AccordionDetails>
    </Accordion>
  )
}
