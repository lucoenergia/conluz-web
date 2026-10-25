import { useId, type FC, type ReactNode, type SyntheticEvent } from "react";
import { BasicModal } from "./BasicModal";
import { Button, Typography, Box } from "@mui/material";

interface AlertModalProps {
  children: ReactNode;
  onClose: (event: SyntheticEvent) => void;
  isOpen: boolean;
}

export const AlertModal: FC<AlertModalProps> = ({ onClose, isOpen, children }) => {
  const messageId = useId();
  return (
    // Named by its message: it has no heading.
    <BasicModal isOpen={isOpen} onClose={onClose} labelledBy={messageId}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          p: 3,
        }}
      >
        <Typography id={messageId} sx={{ textAlign: "center" }}>{children}</Typography>
        <Button variant="text" color="primary" onClick={onClose}>
          Cerrar
        </Button>
      </Box>
    </BasicModal>
  );
};
