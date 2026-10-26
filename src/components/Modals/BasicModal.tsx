import * as React from "react";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import { radii, alphas } from "../../theme/tokens";

/**
 * A dialog's accessible name: the id of the heading that names it, or, when
 * nothing on screen does, the name itself. One of the two is required, so a
 * modal cannot be announced as an unnamed dialog.
 */
export type DialogName = { labelledBy: string; label?: never } | { label: string; labelledBy?: never };

export type BasicModalProps = DialogName & {
  isOpen: boolean;
  /**
   * Called on Escape and on a backdrop click, with the event that caused it:
   * the modal is a portal, but its events still bubble through the React tree
   * to whatever renders it, which may need to stop them.
   */
  onClose: (event: React.SyntheticEvent) => void;
  /**
   * False while the dialog's write is in flight: Escape and a backdrop click
   * then do nothing, so the dialog stays until the write settles (#310).
   */
  dismissible?: boolean;
  children: React.ReactNode;
};

const modalContainerStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: 'white',
  borderRadius: radii.large,
  // eslint-disable-next-line no-restricted-syntax -- MUI elevation integer, not a shadow string
  boxShadow: 24,
  maxWidth: { xs: '90%', sm: 500 },
  minWidth: { xs: 280, sm: 400 },
  width: '100%',
  outline: 'none',
};

export const BasicModal: React.FC<BasicModalProps> = ({
  isOpen,
  onClose,
  labelledBy,
  label,
  dismissible = true,
  children,
}) => {
  return (
    <Modal
      open={isOpen}
      // MUI types the event as {}; it is the keyboard or backdrop event.
      onClose={dismissible ? (event) => onClose(event as React.SyntheticEvent) : undefined}
      disableEscapeKeyDown={!dismissible}
      slotProps={{ backdrop: { sx: { backgroundColor: alphas.black.overlay } } }}
    >
      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        sx={modalContainerStyle}
      >
        {children}
      </Box>
    </Modal>
  );
};
