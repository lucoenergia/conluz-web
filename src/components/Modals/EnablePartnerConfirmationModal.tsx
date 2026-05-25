import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { alphas, fontSizes } from "../../theme/tokens";

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
      title={`Habilitar a ${partnerName}`}
      icon={<CheckCircleOutlineIcon sx={{ fontSize: 28, color: "success.main" }} />}
      iconBg={alphas.success.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          color: "text.secondary",
          lineHeight: 1.6,
          mb: 2,
        }}
      >
        Al habilitar un socio le das acceso a la plataforma
      </Typography>
    </ConfirmationModal>
  );
};
