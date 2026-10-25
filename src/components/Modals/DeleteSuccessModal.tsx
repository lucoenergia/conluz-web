import { useId, type FC, type SyntheticEvent } from "react";
import { AppModal } from "./AppModal";
import { Button, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { radii, shadows, alphas, fontSizes, interactiveTransition} from "../../theme/tokens";

interface DeleteSuccessModalProps {
  onClose: (event: SyntheticEvent) => void;
  isOpen: boolean;
  code: string;
}

export const DeleteSuccessModal: FC<DeleteSuccessModalProps> = ({ onClose, isOpen, code }) => {
  const nameId = useId();
  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      centered
      labelledBy={`${nameId}-lead ${nameId}-code ${nameId}-outcome`}
      icon={<CheckCircleIcon sx={{ fontSize: 40, color: "success.main" }} />}
      iconBg={alphas.success.light}
    >
      <Typography
        id={`${nameId}-lead`}
        sx={{
          fontSize: fontSizes["2xl"],
          color: "secondary.main",
          lineHeight: 1.6,
          mb: 2,
        }}
      >
        La planta
      </Typography>
      <Typography
        id={`${nameId}-code`}
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
        {code}
      </Typography>
      <Typography
        id={`${nameId}-outcome`}
        sx={{
          fontSize: fontSizes["2xl"],
          color: "secondary.main",
          lineHeight: 1.6,
          mb: 3,
        }}
      >
        ha sido eliminada
      </Typography>
      <Button
        variant="contained"
        onClick={onClose}
        sx={{
          minWidth: "120px",
          padding: "8px 24px",
          fontSize: fontSizes.lg,
          transition: interactiveTransition("250ms", "cubic-bezier(0.4, 0, 0.2, 1)"),
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
