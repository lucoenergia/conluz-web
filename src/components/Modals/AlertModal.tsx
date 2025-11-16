import type { FC, ReactNode } from "react";
import { BasicModal } from "./BasicModal";
import { Button, Typography, Box } from "@mui/material";

interface AlertModalProps {
  children: ReactNode;
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  isOpen: boolean;
}

export const AlertModal: FC<AlertModalProps> = ({ onClose, isOpen, children }) => {
  return (
    <BasicModal isOpen={isOpen} onClose={onClose}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          p: 3,
        }}
      >
        <Typography sx={{ textAlign: "center" }}>{children}</Typography>
        <Button variant="text" color="primary" onClick={onClose}>
          Cerrar
        </Button>
      </Box>
    </BasicModal>
  );
};
