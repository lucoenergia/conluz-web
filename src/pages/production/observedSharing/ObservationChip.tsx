import type { FC } from "react";
import { Chip } from "@mui/material";
import { TONE_SX, type ObservationTone } from "./observedSharingLabels";

/** A status, a recommendation or a kind of date, in the tone it is read in. */
export const ObservationChip: FC<{ label: string; tone: ObservationTone }> = ({ label, tone }) => (
  <Chip size="small" label={label} sx={{ ...TONE_SX[tone], fontWeight: 600, maxWidth: "100%" }} />
);
