import { useState, type FC } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { sxStyles } from "../../theme/sx";
import { colors, fontSizes, radii } from "../../theme/tokens";
import { useErrorDispatch } from "../../context/error.context";
import { formatCalendarDate } from "../../utils/formatCalendarDate";
import { SectionHeading } from "../SectionHeading";
import { SharingAgreementActionButton } from "../SharingAgreementActionButton";
import {
  COEFFICIENT_SCALE,
  computeSharingAgreementCoefficientSums,
  isFullSum,
  type CoefficientSummable,
} from "../../pages/production/sharingAgreementCoefficientSums";
import { formatCoefficientGapMessage } from "../../pages/production/sharingAgreementGapMessage";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";
import { downloadSharingAgreementFile, triggerBrowserDownload } from "./downloadSharingAgreementFile";
import { SharingAgreementGenerateDialog } from "../SharingAgreementGenerateDialog";

export interface SharingAgreementFilePanelProps {
  plantId: string;
  sharingAgreementId: string;
  agreement: SharingAgreementResponse | undefined;
  coefficients: CoefficientSummable[];
  plantRegulatoryCode: string | undefined;
  /**
   * Controlled by the page: the next-step banner offers the same download for
   * stages 2-4, so the dialog cannot own its own open state down here.
   */
  isGenerateDialogOpen: boolean;
  onGenerateDialogOpenChange: (isOpen: boolean) => void;
}

const SUB_HEADING_SX = {
  fontSize: fontSizes["2xl"],
  fontWeight: 600,
  color: colors.text.primary,
  mb: 1.25,
} as const;

const BODY_SX = {
  fontSize: fontSizes.xl,
  lineHeight: 1.5,
  color: colors.text.body,
  textWrap: "pretty",
} as const;

export const SharingAgreementFilePanel: FC<SharingAgreementFilePanelProps> = ({
  plantId,
  sharingAgreementId,
  agreement,
  coefficients,
  plantRegulatoryCode,
  isGenerateDialogOpen,
  onGenerateDialogOpenChange,
}) => {
  const errorDispatch = useErrorDispatch();
  const [showGeneratedNotice, setShowGeneratedNotice] = useState(false);

  // Defensive: the generated type claims `file` is never null, but the OpenAPI
  // schema marks it nullable and Orval didn't emit the usual `| null` alias
  // for this one field (unlike sibling nullable fields on this same response)
  // — treat it as possibly null at runtime regardless of what the type says.
  const file = agreement?.file ?? null;
  const isDraft = agreement?.status === SharingAgreementResponseStatus.DRAFT;

  const { fileSumUnits } = computeSharingAgreementCoefficientSums(coefficients);
  // One wording for the shortfall across the whole surface. This panel used to
  // say "exactamente 100 %" while the lifecycle said "Faltan X para llegar al
  // 100,0000 %" — two forms of the same rule, one of them at a precision the
  // coefficients do not actually use.
  const generateDisabledReason = !plantRegulatoryCode
    ? "Esta planta no tiene código regulatorio (CAU) asignado."
    : !isFullSum(fileSumUnits)
      ? (formatCoefficientGapMessage(COEFFICIENT_SCALE - fileSumUnits) ?? undefined)
      : undefined;

  const downloadMutation = useMutation({
    mutationFn: () => downloadSharingAgreementFile(plantId, sharingAgreementId),
    onSuccess: ({ blob, filename }) => triggerBrowserDownload(blob, filename),
    onError: () => errorDispatch("Ha habido un problema al descargar el fichero. Por favor, inténtalo más tarde"),
  });

  return (
    <Paper elevation={0} sx={sxStyles.softPanel}>
      <SectionHeading
        title="Fichero para la distribuidora"
        description="El TXT con los coeficientes que la distribuidora necesita para aplicar el reparto."
      />

      {/* Generating persists nothing: POST .../generate-file builds the TXT in
          memory from the current coefficients and streams it back. Presenting it
          next to the imported file made it look like the two fed one slot. */}
      <Box sx={{ mb: 3 }}>
        <Typography component="h3" sx={SUB_HEADING_SX}>
          Generar y descargar
        </Typography>
        <Typography sx={{ ...BODY_SX, mb: 2 }}>
          Se construye en este momento con los coeficientes actuales. Conluz no guarda el fichero: se descarga en tu
          dispositivo y lo envías tú.
        </Typography>
        <SharingAgreementActionButton
          emphasis="primary"
          action={{
            label: "Generar y descargar TXT",
            onClick: () => onGenerateDialogOpenChange(true),
            disabledReason: generateDisabledReason,
          }}
        />
        {showGeneratedNotice && (
          <Alert severity="info" onClose={() => setShowGeneratedNotice(false)} sx={{ mt: 2 }}>
            El fichero se ha generado a partir de los coeficientes actuales y se ha descargado. Conluz no guarda
            ninguna copia ni lo envía a la distribuidora — hazlo llegar por tu medio habitual (por ejemplo, email).
          </Alert>
        )}
      </Box>

      <Box sx={{ borderTop: "1px solid", borderColor: colors.divider, pt: 3 }}>
        <Typography component="h3" sx={SUB_HEADING_SX}>
          Fichero importado
        </Typography>

        {file ? (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                bgcolor: colors.background.surface,
                border: "1px solid",
                borderColor: colors.border.light,
                borderRadius: radii.default,
                p: 2,
              }}
            >
              <DescriptionOutlinedIcon sx={{ color: colors.text.secondary, fontSize: 24, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" fontWeight="600" sx={{ wordBreak: "break-all" }}>
                  {file.filename}
                </Typography>
                {file.uploadedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Importado el {formatCalendarDate(file.uploadedAt)}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Persistent, not a dismissible alert: the mismatch it warns about
                does not go away when the notice does. Editing the coefficients
                never touches the stored file, and nothing compares the two. */}
            {isDraft && (
              <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                <WarningAmberOutlinedIcon sx={{ color: colors.warning.main, fontSize: 20, flexShrink: 0 }} />
                <Typography sx={BODY_SX}>
                  Si editas los coeficientes, este fichero deja de coincidir con el reparto.
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadOutlinedIcon />}
                onClick={() => downloadMutation.mutate()}
                disabled={downloadMutation.isPending}
              >
                {downloadMutation.isPending ? "Descargando…" : "Descargar fichero importado"}
              </Button>
            </Box>
          </>
        ) : (
          <Typography sx={{ ...BODY_SX, color: colors.text.secondary }}>
            No has importado ningún fichero en este acuerdo.
          </Typography>
        )}
      </Box>

      {plantRegulatoryCode && (
        <SharingAgreementGenerateDialog
          isOpen={isGenerateDialogOpen}
          plantId={plantId}
          sharingAgreementId={sharingAgreementId}
          regulatoryCode={plantRegulatoryCode}
          onClose={() => onGenerateDialogOpenChange(false)}
          onGenerateSuccess={() => setShowGeneratedNotice(true)}
        />
      )}
    </Paper>
  );
};
