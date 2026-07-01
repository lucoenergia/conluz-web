import { Alert, Typography } from "@mui/material";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import AddModeratorIcon from "@mui/icons-material/AddModerator";
import { alphas, fontSizes } from "../../theme/tokens";

interface GrantPlatformAdminConfirmationModalProps {
  isOpen: boolean;
  userName: string;
  isPending?: boolean;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
}

export const GrantPlatformAdminConfirmationModal: FC<GrantPlatformAdminConfirmationModalProps> = ({
  isOpen,
  userName,
  isPending = false,
  onCancel,
  onConfirm,
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Conceder"
      confirmColor="primary"
      confirmDisabled={isPending}
      onConfirm={onConfirm}
      title={`Conceder admin de plataforma a ${userName}`}
      icon={<AddModeratorIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alphas.success.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          color: "text.secondary",
          lineHeight: 1.6,
          mb: 2,
        }}
      >
        {userName} pasará a ser administrador de plataforma.
      </Typography>
      <Alert severity="info">
        Un administrador de plataforma puede gestionar todos los usuarios y comunidades, además de conceder o
        revocar este mismo rol a otros usuarios.
      </Alert>
    </ConfirmationModal>
  );
};
