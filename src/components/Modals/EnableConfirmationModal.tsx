import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { radii, alphas, fontSizes } from "../../theme/tokens";

interface EnableConfirmationModalProps {
  isOpen: boolean;
  code: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onEnable: () => void;
}

export const EnableConfirmationModal: FC<EnableConfirmationModalProps> = ({ isOpen, code, onCancel, onEnable }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Rehabilitar"
      confirmColor="success"
      onConfirm={onEnable}
      title="Rehabilitar punto de suministro"
      icon={<CheckCircleOutlineIcon sx={{ fontSize: 28, color: "success.main" }} />}
      iconBg={alphas.success.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.md,
          fontWeight: 600,
          color: "secondary.main",
          mb: 2,
          backgroundColor: alphas.success.subtle,
          padding: "8px 12px",
          borderRadius: radii.default,
        }}
      >
        {code}
      </Typography>
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          color: "text.secondary",
          lineHeight: 1.6,
        }}
      >
        Al rehabilitar este punto de suministro sus datos se mostrarán en la plataforma y se contabilizarán para los
        cálculos.
      </Typography>
    </ConfirmationModal>
  );
};
