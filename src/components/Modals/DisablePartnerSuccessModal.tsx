import type { FC } from "react";
import { AppModal } from "./AppModal";
import { Button, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { radii, shadows, alphas, fontSizes } from "../../theme/tokens";

interface DisablePartnerSuccessModalProps {
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  isOpen: boolean;
  partnerName: string;
  wasEnabled?: boolean;
}

export const DisablePartnerSuccessModal: FC<DisablePartnerSuccessModalProps> = ({ onClose, isOpen, partnerName, wasEnabled = false }) => {
  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      centered
      icon={<CheckCircleIcon sx={{ fontSize: 40, color: "success.main" }} />}
      iconBg={alphas.success.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes["2xl"],
          color: "secondary.main",
          lineHeight: 1.6,
          mb: 2,
        }}
      >
        El acceso a la plataforma de
      </Typography>
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          fontWeight: 600,
          color: "text.primary",
          mb: 2,
          backgroundColor: alphas.success.subtle,
          padding: "10px 16px",
          borderRadius: radii.default,
        }}
      >
        {partnerName}
      </Typography>
      <Typography
        sx={{
          fontSize: fontSizes["2xl"],
          color: "secondary.main",
          lineHeight: 1.6,
          mb: 3,
        }}
      >
        ha sido {wasEnabled ? "habilitado" : "deshabilitado"}
      </Typography>
      <Button
        variant="contained"
        onClick={onClose}
        sx={{
          minWidth: "120px",
          padding: "8px 24px",
          fontSize: fontSizes.lg,
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
