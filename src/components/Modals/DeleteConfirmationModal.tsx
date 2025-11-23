import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  code: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onDelete: () => void;
}

export const DeleteConfirmationModal: FC<DeleteConfirmationModalProps> = ({ isOpen, code, onCancel, onDelete }) => {
  return (
    <ConfirmationModal isOpen={isOpen} onCancel={onCancel} confirmLabel="Eliminar" onConfirm={onDelete}>
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
            Eliminar planta
          </Typography>
        </Box>
      </Box>
      <Typography
        sx={{
          fontFamily: "Inter, sans-serif",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "#475569",
          mb: 2,
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          padding: "8px 12px",
          borderRadius: "6px",
        }}
      >
        {code}
      </Typography>
      <Typography
        sx={{
          fontFamily: "Inter, sans-serif",
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
