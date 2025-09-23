import type { FC, ReactNode } from "react";
import { BasicModal } from "./BasicModal";
import { Button, Typography } from "@mui/material";

interface AlertModalProps {
  children: ReactNode;
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  isOpen: boolean;
}

export const AlertModal: FC<AlertModalProps> = ({ onClose, isOpen, children }) => {
  return (
    <BasicModal isOpen={isOpen} onClose={onClose}>
      <Typography className="flex flex-col items-center text-center">{children}</Typography>
      <Button variant="text" color="primary" onClick={onClose}>
        Cerrar
      </Button>
    </BasicModal>
  );
};
