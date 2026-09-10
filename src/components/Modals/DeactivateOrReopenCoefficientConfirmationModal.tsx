import type { FC, MouseEvent } from "react";
import { Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ConfirmationModal } from "./ConfirmationModal";
import { alphas, fontSizes, radii } from "../../theme/tokens";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { getCoefficientCupsLabel } from "../../pages/production/sharingAgreementCoefficientState";
import { CoefficientDialogErrorPanel } from "./coefficientLifecycleDialogHelpers";

interface DeactivateOrReopenCoefficientConfirmationModalProps {
  isOpen: boolean;
  action: "deactivate" | "reopen";
  coefficient: SharingAgreementPartitionCoefficientResponse | undefined;
  isPending: boolean;
  errorMessages: string[] | null;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
}

const COPY = {
  deactivate: {
    title: "Desactivar coeficiente",
    effect:
      "Se revertirá la activación de este coeficiente y volverá a quedar pendiente de aplicación. La producción ya atribuida a este suministro —que puede haberse mostrado o facturado ya— cambiará de forma retroactiva.",
  },
  reopen: {
    title: "Reabrir coeficiente",
    effect:
      "Se reabrirá este coeficiente y dejará de tener fecha de fin. La producción ya atribuida a partir de ese cierre —que puede haberse mostrado o facturado ya— cambiará de forma retroactiva.",
  },
} as const;

export const DeactivateOrReopenCoefficientConfirmationModal: FC<DeactivateOrReopenCoefficientConfirmationModalProps> = ({
  isOpen,
  action,
  coefficient,
  isPending,
  errorMessages,
  onCancel,
  onConfirm,
}) => {
  const copy = COPY[action];

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Confirmar y recalcular"
      confirmDisabled={isPending}
      onConfirm={onConfirm}
      title={copy.title}
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
        {getCoefficientCupsLabel(coefficient)}
      </Typography>
      <Typography sx={{ fontSize: fontSizes.lg, color: "text.secondary", lineHeight: 1.6 }}>{copy.effect}</Typography>
      <CoefficientDialogErrorPanel errorMessages={errorMessages} />
    </ConfirmationModal>
  );
};
