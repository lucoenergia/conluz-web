import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import { shadows, fontSizes, interactiveTransition } from "../../theme/tokens";
import type { FC, MouseEvent, SyntheticEvent } from "react";

export type ConfirmColor = "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";

export interface ConfirmationActionsProps {
  onCancel: (event: SyntheticEvent) => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmColor?: ConfirmColor;
  confirmDisabled?: boolean;
  /** Swaps the confirm button's label for a spinner. */
  confirmPending?: boolean;
  /** The confirmed write is in flight: "Cancelar" is disabled. */
  inFlight?: boolean;
}

/** A confirmation's footer: "Cancelar" and the confirm button. */
export const ConfirmationActions: FC<ConfirmationActionsProps> = ({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmColor = "error",
  confirmDisabled = false,
  confirmPending = false,
  inFlight = false,
}) => {
  const handleConfirm = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={onCancel}
        disabled={inFlight}
        sx={{
          minWidth: "64px",
          padding: "5px 15px",
          fontSize: fontSizes.lg,
          transition: interactiveTransition("250ms", "cubic-bezier(0.4, 0, 0.2, 1)"),
          borderColor: (theme) => theme.palette.primary.main,
          color: (theme) => theme.palette.primary.main,
          "&:hover": {
            borderColor: (theme) => theme.palette.primary.dark,
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
          },
        }}
      >
        Cancelar
      </Button>
      <Button
        variant="contained"
        color={confirmColor}
        onClick={handleConfirm}
        disabled={confirmDisabled}
        // The spinner replaces the label, which would otherwise leave the
        // button with no accessible name for the duration of the request.
        aria-label={confirmPending ? confirmLabel : undefined}
        sx={{
          minWidth: "64px",
          padding: "5px 15px",
          fontSize: fontSizes.lg,
          transition: interactiveTransition("250ms", "cubic-bezier(0.4, 0, 0.2, 1)"),
          boxShadow: shadows.medium,
          "&:hover": {
            boxShadow: shadows.strong,
          },
        }}
      >
        {confirmPending ? <CircularProgress size={20} color="inherit" /> : confirmLabel}
      </Button>
    </>
  );
};
