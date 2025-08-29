import { type FC, type ReactNode } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Skeleton, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface DropdownCardProps {
  className?: string,
  children: ReactNode
}

export const LoadingDropdownCard: FC<DropdownCardProps> = ({ className, children}) => {
  return (
    <Accordion className={`rounded p-2 ${className}`}>
      <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
        <Typography className="text-2xl font-bold"><Skeleton/></Typography>
      </AccordionSummary>
      <AccordionDetails className="grid gap-4">
        {children}
      </AccordionDetails>
    </Accordion>
  )
}
