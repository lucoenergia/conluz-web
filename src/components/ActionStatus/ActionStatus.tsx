import type { FC } from "react";
import { Box } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

export interface ActionStatusProps {
  /** Empty until there is something to announce. */
  message: string;
}

/**
 * Announces the outcome of a one-off action — publishing an agreement, reverting
 * it — for users who cannot see the chip change.
 *
 * Like `ResultStatus`, this is a PERSISTENT region: it stays mounted and only its
 * text changes. A live region inserted at the same moment as its content is
 * announced unreliably, so mount it once for the page rather than rendering it
 * alongside the thing that succeeded.
 *
 * `polite` rather than `assertive`: the action has already finished, so there is
 * nothing to interrupt the user for.
 */
export const ActionStatus: FC<ActionStatusProps> = ({ message }) => (
  <Box role="status" aria-live="polite" sx={visuallyHidden}>
    {message}
  </Box>
);
