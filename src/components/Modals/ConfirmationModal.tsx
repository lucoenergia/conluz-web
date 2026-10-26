import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import { AppModal } from "./AppModal";
import { shadows, fontSizes, interactiveTransition} from "../../theme/tokens";
import type { FC, MouseEvent, ReactNode, SyntheticEvent } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  /** Called by "Cancelar", Escape and a backdrop click. */
  onCancel: (event: SyntheticEvent) => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmColor?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
  confirmDisabled?: boolean;
  /** Swaps the confirm button's label for a spinner. Opt-in and false by default — every other confirmation dialog using this component keeps its unchanged static-label behaviour. */
  confirmPending?: boolean;
  /**
   * The confirmed write is in flight: "Cancelar" is disabled, and Escape and a
   * backdrop click do nothing, until it settles (#310). Independent of
   * `confirmPending`, which only swaps the label for a spinner.
   */
  inFlight?: boolean;
  /** The dialog's heading, and its accessible name. */
  title: string;
  /** Forwarded to AppModal: rendered above the title. */
  scopeHeader?: ReactNode;
  icon?: ReactNode;
  iconBg?: string;
  children: ReactNode;
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmColor = "error",
  confirmDisabled = false,
  confirmPending = false,
  inFlight = false,
  title,
  scopeHeader,
  icon,
  iconBg,
  children,
}) => {
  const handleConfirm = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onCancel}
      dismissible={!inFlight}
      title={title}
      scopeHeader={scopeHeader}
      icon={icon}
      iconBg={iconBg}
      actions={
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
      }
    >
      {children}
    </AppModal>
  );
};
