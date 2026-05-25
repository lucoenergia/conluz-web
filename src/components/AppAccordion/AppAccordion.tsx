import { type FC, type ReactNode } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface AppAccordionProps {
  className?: string;
  title: string;
  children: ReactNode;
}

export const AppAccordion: FC<AppAccordionProps> = ({ title, className, children }) => {
  return (
    <Accordion className={className}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h5">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};
