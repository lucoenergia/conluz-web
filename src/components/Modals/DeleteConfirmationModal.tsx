import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { radii, alphas, fontSizes } from "../../theme/tokens";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  code: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onDelete: () => void;
}

export const DeleteConfirmationModal: FC<DeleteConfirmationModalProps> = ({ isOpen, code, onCancel, onDelete }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Eliminar"
      onConfirm={onDelete}
      title="Eliminar planta"
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
        Al eliminar esta planta, todos sus datos se eliminarán permanentemente de la plataforma. Esta acción no se puede deshacer.
      </Typography>
    </ConfirmationModal>
  );
};
