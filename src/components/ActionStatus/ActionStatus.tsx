import { useEffect, useState, type FC } from "react";
import { Box } from "@mui/material";
import { visuallyHidden } from "@mui/utils";

export interface ActionStatusProps {
  /** Empty until there is something to announce. */
  message: string;
}

/**
 * How long a message already there when the region mounts is held back, so the
 * region is in place, empty, before its text arrives.
 */
export const ARRIVAL_ANNOUNCEMENT_DELAY_MS = 100;

/**
 * Announces the outcome of an action — publishing an agreement, saving the
 * profile, a password changed before arriving at the login page — for users
 * who cannot see it.
 *
 * Like `ResultStatus`, this is a PERSISTENT region: it stays mounted and only
 * its text changes. A live region inserted at the same moment as its content
 * is announced unreliably, so mount it once for the page or the dialog rather
 * than alongside the thing that succeeded. A message the page arrives with is
 * held back for `ARRIVAL_ANNOUNCEMENT_DELAY_MS`: the region first renders
 * empty, then takes the text (#310). A message set later is shown at once.
 *
 * The visible text the user reads is a `Notice` (`role="note"`); this region
 * is what is announced.
 *
 * `polite` rather than `assertive`: the action has already finished, so there
 * is nothing to interrupt the user for.
 */
export const ActionStatus: FC<ActionStatusProps> = ({ message }) => {
  const [holding, setHolding] = useState(message !== "");

  useEffect(() => {
    if (!holding) return;
    const timer = setTimeout(() => setHolding(false), ARRIVAL_ANNOUNCEMENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [holding]);

  return (
    <Box role="status" aria-live="polite" sx={visuallyHidden}>
      {holding ? "" : message}
    </Box>
  );
};
