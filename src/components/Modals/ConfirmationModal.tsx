import { AppModal } from "./AppModal";
import { ConfirmationActions, type ConfirmColor } from "./ConfirmationActions";
import type { FC, ReactNode, SyntheticEvent } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  /** Called by "Cancelar", the close icon, Escape, the backdrop and back. */
  onCancel: (event?: SyntheticEvent) => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmColor?: ConfirmColor;
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
}) => (
  <AppModal
    isOpen={isOpen}
    onClose={onCancel}
    size="compact"
    dismissible={!inFlight}
    title={title}
    scopeHeader={scopeHeader}
    icon={icon}
    iconBg={iconBg}
    actions={
      <ConfirmationActions
        onConfirm={onConfirm}
        confirmLabel={confirmLabel}
        confirmColor={confirmColor}
        confirmDisabled={confirmDisabled}
        confirmPending={confirmPending}
        inFlight={inFlight}
      />
    }
  >
    {children}
  </AppModal>
);
