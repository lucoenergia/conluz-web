import { type FC, type ReactNode } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Skeleton, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface LoadingAppAccordionProps {
  className?: string;
  children: ReactNode;
}

export const LoadingAppAccordion: FC<LoadingAppAccordionProps> = ({ className, children }) => {
  return (
    <Accordion className={className}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h5">
          <Skeleton />
        </Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};
