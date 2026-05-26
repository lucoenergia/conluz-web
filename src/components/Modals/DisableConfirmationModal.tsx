import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { radii, alphas, fontSizes } from "../../theme/tokens";

interface DisableConfirmationModalProps {
  isOpen: boolean;
  code: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onDisable: () => void;
}

export const DisableConfirmationModal: FC<DisableConfirmationModalProps> = ({ isOpen, code, onCancel, onDisable }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Deshabilitar"
      onConfirm={onDisable}
      title="Deshabilitar punto de suministro"
      icon={<WarningAmberIcon sx={{ fontSize: 28, color: "error.main" }} />}
      iconBg={alphas.error.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.md,
          fontWeight: 600,
          color: "secondary.main",
          mb: 2,
          backgroundColor: alphas.error.subtle,
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
        Al deshabilitar este punto de suministro sus datos no se mostrarán en la plataforma ni se contabilizarán para
        los cálculos. Los datos producidos por este punto de suministro no se eliminarán.
      </Typography>
    </ConfirmationModal>
  );
};
