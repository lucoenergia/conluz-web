import * as React from "react";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";

interface BasicModalProps {
  isOpen: boolean;
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  children: React.ReactNode;
}

export const BasicModal: React.FC<BasicModalProps> = ({ isOpen, onClose, children }) => {
  return (
    <div>
      <Modal
        open={isOpen}
        onClose={onClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description;"
        className="grid justify-center content-center"
      >
        <Box className="bg-white p-4 rounded-xl grid gap-2 shadow-2xl justify-items-center max-w-md min-w-sm">
          {children}
        </Box>
      </Modal>
    </div>
  );
};
