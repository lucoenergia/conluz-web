import * as React from "react";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import { radii, alphas } from "../../theme/tokens";

interface BasicModalProps {
  isOpen: boolean;
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  children: React.ReactNode;
}

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

export const BasicModal: React.FC<BasicModalProps> = ({ isOpen, onClose, children }) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: alphas.black.overlay,
          },
        },
      }}
    >
      {/* Interim: the visual suite captures this panel by test id only because
          it has no role="dialog" and no accessible name to select it by. That
          gap is reported separately as an accessibility issue, "BasicModal
          renders no dialog role". Once it is fixed, the specs select
          getByRole("dialog", { name }) and this test id goes. */}
      <Box sx={modalContainerStyle} data-testid="modal-panel">
        {children}
      </Box>
    </Modal>
  );
};
