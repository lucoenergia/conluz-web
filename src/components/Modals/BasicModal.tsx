import * as React from "react";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";

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
  borderRadius: 3,
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
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      }}
    >
      <Box sx={modalContainerStyle}>
        {children}
      </Box>
    </Modal>
  );
};
