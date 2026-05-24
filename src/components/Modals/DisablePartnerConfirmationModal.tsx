import Typography from "@mui/material/Typography";
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
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Deshabilitar"
      onConfirm={onDisable}
      title={`Deshabilitar a ${partnerName}`}
      icon={<WarningAmberIcon sx={{ fontSize: 28, color: "#ef4444" }} />}
      iconBg="rgba(239, 68, 68, 0.1)"
    >
      <Typography
        sx={{
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
