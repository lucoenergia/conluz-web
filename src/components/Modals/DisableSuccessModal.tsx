import type { FC } from "react";
import { AppModal } from "./AppModal";
import { Button, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { radii, shadows } from "../../theme/tokens";

interface DisableSuccessModalProps {
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  isOpen: boolean;
  code: string;
}

export const DisableSuccessModal: FC<DisableSuccessModalProps> = ({ onClose, isOpen, code }) => {
  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      centered
      icon={<CheckCircleIcon sx={{ fontSize: 40, color: "#10b981" }} />}
      iconBg="rgba(16, 185, 129, 0.1)"
    >
      <Typography
        sx={{
          fontSize: "1.125rem",
          color: "#475569",
          lineHeight: 1.6,
          mb: 2,
        }}
      >
        El punto de suministro
      </Typography>
      <Typography
        sx={{
          fontSize: "0.9375rem",
          fontWeight: 600,
          color: "#1e293b",
          mb: 2,
          backgroundColor: "rgba(16, 185, 129, 0.08)",
          padding: "10px 16px",
          borderRadius: radii.default,
        }}
      >
        {code}
      </Typography>
      <Typography
        sx={{
          fontSize: "1.125rem",
          color: "#475569",
          lineHeight: 1.6,
          mb: 3,
        }}
      >
        ha sido deshabilitado
      </Typography>
      <Button
        variant="contained"
        onClick={onClose}
        sx={{
          minWidth: "120px",
          padding: "8px 24px",
          fontSize: "0.9375rem",
          transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          backgroundColor: (theme) => theme.palette.primary.main,
          color: "white",
          boxShadow: shadows.medium,
          "&:hover": {
            backgroundColor: (theme) => theme.palette.primary.dark,
            boxShadow: shadows.strong,
          },
        }}
      >
        Cerrar
      </Button>
    </AppModal>
  );
};
