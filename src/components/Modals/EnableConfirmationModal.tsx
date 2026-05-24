import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { radii } from "../../theme/tokens";

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
      icon={<CheckCircleOutlineIcon sx={{ fontSize: 28, color: "#10b981" }} />}
      iconBg="rgba(16, 185, 129, 0.1)"
    >
      <Typography
        sx={{
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "#475569",
          mb: 2,
          backgroundColor: "rgba(16, 185, 129, 0.08)",
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
        Al rehabilitar este punto de suministro sus datos se mostrarán en la plataforma y se contabilizarán para los
        cálculos.
      </Typography>
    </ConfirmationModal>
  );
};
