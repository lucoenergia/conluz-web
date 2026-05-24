import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { radii } from "../../theme/tokens";

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
      icon={<WarningAmberIcon sx={{ fontSize: 28, color: "#ef4444" }} />}
      iconBg="rgba(239, 68, 68, 0.1)"
    >
      <Typography
        sx={{
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "#475569",
          mb: 2,
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          padding: "8px 12px",
          borderRadius: radii.default,
        }}
      >
        {code}
      </Typography>
      <Typography
        sx={{
          fontSize: "0.9375rem",
          color: "#64748b",
          lineHeight: 1.6,
        }}
      >
        Al eliminar esta planta, todos sus datos se eliminarán permanentemente de la plataforma. Esta acción no se puede deshacer.
      </Typography>
    </ConfirmationModal>
  );
};
