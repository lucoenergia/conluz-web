import { Alert, Box, Typography } from "@mui/material";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import { alphas, colors, fontSizes, radii } from "../../theme/tokens";

interface PublishSharingAgreementConfirmationModalProps {
  isOpen: boolean;
  agreementName: string;
  /** The coefficient sum, already formatted at the project's fixed precision. */
  fileSumLabel: string;
  coefficientCount: number;
  isPublishing?: boolean;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
}

/** Plural category rather than `count === 1`, so this survives a language with more than two forms. */
function supplyPointLabel(count: number, locale = "es-ES"): string {
  return new Intl.PluralRules(locale).select(count) === "one" ? "punto de suministro" : "puntos de suministro";
}

export const PublishSharingAgreementConfirmationModal: FC<PublishSharingAgreementConfirmationModalProps> = ({
  isOpen,
  agreementName,
  fileSumLabel,
  coefficientCount,
  isPublishing = false,
  onCancel,
  onConfirm,
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Poner en vigor"
      // Sealing an agreed reparto is the constructive move in this workflow. The
      // component's default is "error", which would render it in the same red as
      // Eliminar and read as destruction at the moment of commitment.
      confirmColor="primary"
      confirmDisabled={isPublishing}
      confirmPending={isPublishing}
      onConfirm={onConfirm}
      title="Poner en vigor"
      icon={<PublishOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
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

      {/* What is being sealed, restated at the precision the distributor validates. */}
      <Typography
        sx={{
          fontSize: fontSizes.md,
          color: "text.secondary",
          mb: 2,
        }}
      >
        Suma de los coeficientes:{" "}
        <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
          {fileSumLabel}
        </Box>{" "}
        · {coefficientCount} {supplyPointLabel(coefficientCount)}
      </Typography>

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
          Hazlo cuando la distribuidora haya aceptado el reparto. Poner en vigor no aplica nada por sí mismo:
          después tendrás que registrar la fecha de aplicación de cada punto. Hasta entonces el acuerdo no reparte
          producción, y el autoconsumo y los excedentes solo se muestran con los datos de la distribuidora, que
          llegan con varios días de retraso.
        </Box>
        <Box component="span" sx={{ display: "block", mt: 1 }}>
          Podrás volver a borrador mientras no se haya aplicado ningún coeficiente. En cuanto aplique
          alguno, dejará de ser posible y cualquier cambio exigirá un acuerdo nuevo.
        </Box>
      </Alert>
    </ConfirmationModal>
  );
};
