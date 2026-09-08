import { Alert, Box, Typography } from "@mui/material";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import { alphas, fontSizes } from "../../theme/tokens";

interface PublishSharingAgreementConfirmationModalProps {
  isOpen: boolean;
  isPublishing?: boolean;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
}

export const PublishSharingAgreementConfirmationModal: FC<PublishSharingAgreementConfirmationModalProps> = ({
  isOpen,
  isPublishing = false,
  onCancel,
  onConfirm,
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Poner en vigor"
      confirmDisabled={isPublishing}
      onConfirm={onConfirm}
      title="Poner en vigor"
      icon={<PublishOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alphas.info.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          color: "text.secondary",
          lineHeight: 1.6,
          mb: 2,
        }}
      >
        Al poner el acuerdo en vigor, el reparto queda sellado: no podrás editar los coeficientes mientras esté
        vigente.
      </Typography>
      <Alert severity="info">
        <Box component="span" sx={{ display: "block" }}>
          Poner en vigor no aplica nada por sí mismo. Que el 0 % esté aplicado justo después es el comienzo normal
          del despliegue.
        </Box>
        <Box component="span" sx={{ display: "block", mt: 1 }}>
          Podrás volver a borrador mientras no se haya aplicado ningún coeficiente. En cuanto aplique
          alguno, dejará de ser posible y cualquier cambio exigirá un acuerdo nuevo.
        </Box>
      </Alert>
    </ConfirmationModal>
  );
};
