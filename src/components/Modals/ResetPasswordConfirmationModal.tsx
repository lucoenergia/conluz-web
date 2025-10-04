import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import LockResetIcon from "@mui/icons-material/LockReset";

interface ResetPasswordConfirmationModalProps {
  isOpen: boolean;
  partnerName: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onReset: () => void;
}

export const ResetPasswordConfirmationModal: FC<ResetPasswordConfirmationModalProps> = ({
  isOpen,
  partnerName,
  onCancel,
  onReset,
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Reestablecer"
      confirmColor="primary"
      onConfirm={onReset}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            backgroundColor: "rgba(102, 126, 234, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LockResetIcon sx={{ fontSize: 28, color: "#667eea" }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            component="h2"
            sx={{
              fontFamily: "Inter, sans-serif",
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            Reestablecer contraseña para {partnerName}
          </Typography>
        </Box>
      </Box>
      <Typography
        sx={{
          fontFamily: "Inter, sans-serif",
          fontSize: "0.9375rem",
          color: "#64748b",
          lineHeight: 1.6,
          mb: 2,
        }}
      >
        Para que el socio pueda reestablecer su contraseña, se le enviará un email con instrucciones.
      </Typography>
    </ConfirmationModal>
  );
};
