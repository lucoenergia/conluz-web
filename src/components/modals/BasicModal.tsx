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
      >
        <Box className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white border-2 border-black shadow-2xl p-4 flex flex-col justify-center items-center gap-2">
          {children}
        </Box>
      </Modal>
    </div>
  );
};
