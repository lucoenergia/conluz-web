import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { radii, alphas, fontSizes } from "../../theme/tokens";

interface DeleteSharingAgreementConfirmationModalProps {
  isOpen: boolean;
  agreementName: string;
  isDeleting?: boolean;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
}

export const DeleteSharingAgreementConfirmationModal: FC<DeleteSharingAgreementConfirmationModalProps> = ({
  isOpen,
  agreementName,
  isDeleting = false,
  onCancel,
  onConfirm,
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Eliminar"
      confirmDisabled={isDeleting}
      onConfirm={onConfirm}
      title="Eliminar acuerdo de reparto"
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
        {agreementName}
      </Typography>
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          color: "text.secondary",
          lineHeight: 1.6,
        }}
      >
        Se eliminarán permanentemente este borrador y los coeficientes que se hayan introducido en él. Ningún reparto
        ya calculado depende de un borrador, así que el historial de los miembros no se ve afectado.
      </Typography>
    </ConfirmationModal>
  );
};
