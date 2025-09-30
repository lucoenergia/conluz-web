import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

interface EnablePartnerConfirmationModalProps {
  isOpen: boolean;
  partnerName: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onEnable: () => void;
}

export const EnablePartnerConfirmationModal: FC<EnablePartnerConfirmationModalProps> = ({
  isOpen,
  partnerName,
  onCancel,
  onEnable,
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Habilitar"
      confirmColor="success"
      onConfirm={onEnable}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 28, color: "#10b981" }} />
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
            Habilitar a {partnerName}
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
        Al habilitar un socio le das acceso a la plataforma
      </Typography>
    </ConfirmationModal>
  );
};
