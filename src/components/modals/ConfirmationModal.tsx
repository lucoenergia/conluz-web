import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { BasicModal } from "./BasicModal";
import type { FC, MouseEvent, ReactNode } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
  confirmLabel: string,
  confirmColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning', 
  children: ReactNode
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmColor = "error",
  children
}) => {

  const handleConfirm = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <BasicModal isOpen={isOpen} onClose={onCancel}>
      { children }
      <Box className="flex justify-around pt-8 gap-5">
        <Button
          variant="contained"
          color={confirmColor}
          onClick={handleConfirm}
          className="flex items-center justify-center text-center leading-none"
        >
          { confirmLabel }
        </Button>
        <Button variant="contained" color="primary" onClick={onCancel}>
          Cancelar
        </Button>
      </Box>
    </BasicModal>
  );
};
