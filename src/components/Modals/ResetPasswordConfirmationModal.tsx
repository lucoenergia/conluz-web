import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { useTheme, alpha } from "@mui/material/styles";
import { ConfirmationModal } from "./ConfirmationModal";
import LockResetIcon from "@mui/icons-material/LockReset";
import { fontSizes } from "../../theme/tokens";

interface ResetPasswordConfirmationModalProps {
  isOpen: boolean;
  partnerName: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onReset: () => void;
}

export const ResetPasswordConfirmationModal: FC<ResetPasswordConfirmationModalProps> = ({
  isOpen,
  partnerName,
  onCancel,
  onReset,
}) => {
  const theme = useTheme();
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Reestablecer"
      confirmColor="primary"
      onConfirm={onReset}
      title={`Reestablecer contraseña para ${partnerName}`}
      icon={<LockResetIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alpha(theme.palette.primary.main, 0.1)}
    >
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          color: "text.secondary",
          lineHeight: 1.6,
          mb: 2,
        }}
      >
        Para que el socio pueda reestablecer su contraseña, se le enviará un email con instrucciones.
      </Typography>
    </ConfirmationModal>
  );
};
