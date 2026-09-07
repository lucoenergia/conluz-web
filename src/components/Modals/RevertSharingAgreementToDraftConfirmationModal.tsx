import { Typography } from "@mui/material";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import { alphas, fontSizes } from "../../theme/tokens";

interface RevertSharingAgreementToDraftConfirmationModalProps {
  isOpen: boolean;
  isReverting?: boolean;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
}

export const RevertSharingAgreementToDraftConfirmationModal: FC<
  RevertSharingAgreementToDraftConfirmationModalProps
> = ({ isOpen, isReverting = false, onCancel, onConfirm }) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Volver a borrador"
      confirmColor="primary"
      confirmDisabled={isReverting}
      onConfirm={onConfirm}
      title="Volver a borrador"
      icon={<UndoOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alphas.info.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          color: "text.secondary",
          lineHeight: 1.6,
        }}
      >
        El acuerdo dejará de estar en vigor y sus coeficientes volverán a ser editables. Si ya enviaste el fichero a
        la distribuidora, tendrás que enviarle uno corregido cuando vuelvas a ponerlo en vigor.
      </Typography>
    </ConfirmationModal>
  );
};
