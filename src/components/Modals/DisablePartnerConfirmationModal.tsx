import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface DisablePartnerConfirmationModalProps {
  isOpen: boolean;
  partnerName: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onDisable: () => void;
}

export const DisablePartnerConfirmationModal: FC<DisablePartnerConfirmationModalProps> = ({
  isOpen,
  partnerName,
  onCancel,
  onDisable,
}) => {
  return (
    <ConfirmationModal isOpen={isOpen} onCancel={onCancel} confirmLabel="Deshabilitar" onConfirm={onDisable}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 28, color: "#ef4444" }} />
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
            Deshabilitar a {partnerName}
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
        Al deshabilitar un socio le impides el acceso a la herramienta, pero ninguno de sus datos serán eliminados de
        la plataforma
      </Typography>
    </ConfirmationModal>
  );
};
