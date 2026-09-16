import { Alert, Typography } from "@mui/material";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import { alphas, colors, fontSizes, radii } from "../../theme/tokens";

interface RevertSharingAgreementToDraftConfirmationModalProps {
  isOpen: boolean;
  agreementName: string;
  isReverting?: boolean;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
}

export const RevertSharingAgreementToDraftConfirmationModal: FC<
  RevertSharingAgreementToDraftConfirmationModalProps
> = ({ isOpen, agreementName, isReverting = false, onCancel, onConfirm }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Volver a borrador"
      confirmColor="primary"
      confirmDisabled={isReverting}
      confirmPending={isReverting}
      onConfirm={onConfirm}
      title="Volver a borrador"
      icon={<UndoOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alphas.info.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.md,
          fontWeight: 600,
          color: "secondary.main",
          mb: 2,
          backgroundColor: colors.brand.surface,
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
          mb: 2,
        }}
      >
        El acuerdo dejará de estar en vigor y sus coeficientes volverán a ser editables.
      </Typography>

      {/* The rule the publish dialog explains in advance, stated here where it is
          about to matter: this route exists only while nothing has been applied. */}
      <Alert severity="info">
        Puedes hacerlo porque la distribuidora todavía no ha aplicado ningún coeficiente. En cuanto aplique alguno,
        el acuerdo ya no podrá volver a borrador y cualquier cambio exigirá un acuerdo nuevo.
      </Alert>
    </ConfirmationModal>
  );
};
