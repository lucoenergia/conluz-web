import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { BasicModal } from "./BasicModal";
import type { FC, MouseEvent, ReactNode } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmColor?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
  children: ReactNode;
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmColor = "error",
  children,
}) => {
  const handleConfirm = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <BasicModal isOpen={isOpen} onClose={onCancel}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {children}
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          pt: 3,
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
        }}
      >
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{
            textTransform: "none",
            minWidth: "64px",
            padding: "5px 15px",
            fontFamily: "Inter, sans-serif",
            fontSize: "0.9375rem",
            borderRadius: "6px",
            transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
            borderColor: "#667eea",
            color: "#667eea",
            "&:hover": {
              borderColor: "#5568d3",
              backgroundColor: "rgba(102, 126, 234, 0.04)",
            },
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={handleConfirm}
          sx={{
            textTransform: "none",
            minWidth: "64px",
            padding: "5px 15px",
            fontFamily: "Inter, sans-serif",
            fontSize: "0.9375rem",
            borderRadius: "6px",
            transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 2px 4px 0 rgba(0,0,0,0.12)",
            "&:hover": {
              boxShadow: "0 4px 8px 0 rgba(0,0,0,0.16)",
            },
          }}
        >
          {confirmLabel}
        </Button>
      </Box>
    </BasicModal>
  );
};
