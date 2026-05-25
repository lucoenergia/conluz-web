import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { alphas, fontSizes } from "../../theme/tokens";

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
      icon={<WarningAmberIcon sx={{ fontSize: 28, color: "error.main" }} />}
      iconBg={alphas.error.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          color: "text.secondary",
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
