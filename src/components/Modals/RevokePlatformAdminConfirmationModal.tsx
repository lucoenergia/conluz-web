import { Alert, Typography } from "@mui/material";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import RemoveModeratorIcon from "@mui/icons-material/RemoveModerator";
import { alphas, fontSizes } from "../../theme/tokens";

interface RevokePlatformAdminConfirmationModalProps {
  isOpen: boolean;
  userName: string;
  isPending?: boolean;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
}

export const RevokePlatformAdminConfirmationModal: FC<RevokePlatformAdminConfirmationModalProps> = ({
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
      confirmLabel="Revocar"
      confirmColor="error"
      confirmDisabled={isPending}
      onConfirm={onConfirm}
      title={`Revocar admin de plataforma a ${userName}`}
      icon={<RemoveModeratorIcon sx={{ fontSize: 28, color: "error.main" }} />}
      iconBg={alphas.error.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          color: "text.secondary",
          lineHeight: 1.6,
          mb: 2,
        }}
      >
        {userName} dejará de ser administrador de plataforma.
      </Typography>
      <Alert severity="info">
        No se puede revocar al último administrador de plataforma: el sistema siempre debe conservar al menos uno.
      </Alert>
    </ConfirmationModal>
  );
};
