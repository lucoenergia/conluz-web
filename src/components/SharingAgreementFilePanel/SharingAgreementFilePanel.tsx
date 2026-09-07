import { useState, type FC } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { useErrorDispatch } from "../../context/error.context";
import { formatCalendarDate } from "../../utils/formatCalendarDate";
import {
  computeSharingAgreementCoefficientSums,
  isFullSum,
  type CoefficientSummable,
} from "../../pages/production/sharingAgreementCoefficientSums";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";
import { downloadSharingAgreementFile, triggerBrowserDownload } from "./downloadSharingAgreementFile";
import { SharingAgreementUploadDialog } from "../SharingAgreementUploadDialog";
import { SharingAgreementGenerateDialog } from "../SharingAgreementGenerateDialog";

export interface SharingAgreementFilePanelProps {
  plantId: string;
  sharingAgreementId: string;
  agreement: SharingAgreementResponse | undefined;
  coefficients: CoefficientSummable[];
  plantRegulatoryCode: string | undefined;
}

interface GenerateButtonProps {
  size?: "small" | "medium";
  label: string;
  disabledReason: string | undefined;
  onClick: () => void;
}

const GenerateButton: FC<GenerateButtonProps> = ({ size = "medium", label, disabledReason, onClick }) => (
  <Box>
    <Button
      size={size}
      variant={size === "small" ? "outlined" : "contained"}
      startIcon={<DescriptionOutlinedIcon />}
      onClick={onClick}
      disabled={!!disabledReason}
    >
      {label}
    </Button>
    {disabledReason && (
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        {disabledReason}
      </Typography>
    )}
  </Box>
);

export const SharingAgreementFilePanel: FC<SharingAgreementFilePanelProps> = ({
  plantId,
  sharingAgreementId,
  agreement,
  coefficients,
  plantRegulatoryCode,
}) => {
  const errorDispatch = useErrorDispatch();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [showGeneratedNotice, setShowGeneratedNotice] = useState(false);

  // Defensive: the generated type claims `file` is never null, but the OpenAPI
  // schema marks it nullable and Orval didn't emit the usual `| null` alias
  // for this one field (unlike sibling nullable fields on this same response)
  // — treat it as possibly null at runtime regardless of what the type says.
  const file = agreement?.file ?? null;
  const isDraft = agreement?.status === SharingAgreementResponseStatus.DRAFT;

  const { fileSumUnits } = computeSharingAgreementCoefficientSums(coefficients);
  const sumIsFull = isFullSum(fileSumUnits);
  const generateDisabledReason = !plantRegulatoryCode
    ? "Esta planta no tiene código regulatorio (CAU) asignado."
    : !sumIsFull
      ? "La suma de los coeficientes debe ser exactamente 100 % para generar el fichero."
      : undefined;

  const downloadMutation = useMutation({
    mutationFn: () => downloadSharingAgreementFile(plantId, sharingAgreementId),
    onSuccess: ({ blob, filename }) => triggerBrowserDownload(blob, filename),
    onError: () => errorDispatch("Ha habido un problema al descargar el fichero. Por favor, inténtalo más tarde"),
  });

  const title = isDraft ? "Fichero para la distribuidora" : "Fichero enviado a la distribuidora";

  return (
    <Paper elevation={0} sx={sxStyles.softPanel}>
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        {title}
      </Typography>

      {showGeneratedNotice && (
        <Alert severity="info" onClose={() => setShowGeneratedNotice(false)} sx={{ mb: 2 }}>
          El fichero se ha generado a partir de los coeficientes actuales y se ha descargado.
          {file && " Puede diferir del fichero guardado si los coeficientes han cambiado desde entonces."} Conluz no
          lo envía automáticamente a la distribuidora — hazlo llegar por tu medio habitual (por ejemplo, email).
        </Alert>
      )}

      {!file && isDraft && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          El TXT que envías a la distribuidora con el reparto. Genéralo aquí desde los coeficientes, o impórtalo si
          ya lo tienes hecho por otro medio.
        </Typography>
      )}

      {!file && (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2 }}>
          <DescriptionOutlinedIcon sx={{ color: colors.text.subtle, fontSize: 24 }} />
          <Typography variant="body2" color="text.secondary">
            {isDraft
              ? "Todavía no hay ningún fichero guardado."
              : "Este acuerdo no tiene fichero. El conjunto de coeficientes ya está cerrado, así que no se puede generar ni importar uno ahora."}
          </Typography>
        </Box>
      )}

      {file && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <DescriptionOutlinedIcon sx={{ color: colors.text.subtle, fontSize: 24 }} />
          <Box>
            <Typography variant="body2" fontWeight="600">
              {file.filename}
            </Typography>
            {file.uploadedAt && (
              <Typography variant="caption" color="text.secondary">
                Subido el {formatCalendarDate(file.uploadedAt)}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
        {!file && isDraft && (
          <>
            <GenerateButton
              label="Generar fichero"
              disabledReason={generateDisabledReason}
              onClick={() => setIsGenerateDialogOpen(true)}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileOutlinedIcon />}
              onClick={() => setIsUploadDialogOpen(true)}
            >
              Importar un fichero que ya tengas
            </Button>
          </>
        )}

        {file && (
          <Button
            variant="outlined"
            startIcon={<DownloadOutlinedIcon />}
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending}
          >
            {downloadMutation.isPending ? "Descargando…" : "Descargar fichero"}
          </Button>
        )}
      </Box>

      {file && isDraft && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            ¿Necesitas cambiarlo?
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <GenerateButton
              size="small"
              label="Generar fichero"
              disabledReason={generateDisabledReason}
              onClick={() => setIsGenerateDialogOpen(true)}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadFileOutlinedIcon />}
              onClick={() => setIsUploadDialogOpen(true)}
            >
              Importar otro fichero
            </Button>
          </Box>
        </Box>
      )}

      <SharingAgreementUploadDialog
        isOpen={isUploadDialogOpen}
        plantId={plantId}
        sharingAgreementId={sharingAgreementId}
        regulatoryCode={plantRegulatoryCode}
        onClose={() => setIsUploadDialogOpen(false)}
      />

      {plantRegulatoryCode && (
        <SharingAgreementGenerateDialog
          isOpen={isGenerateDialogOpen}
          plantId={plantId}
          sharingAgreementId={sharingAgreementId}
          regulatoryCode={plantRegulatoryCode}
          onClose={() => setIsGenerateDialogOpen(false)}
          onGenerateSuccess={() => setShowGeneratedNotice(true)}
        />
      )}
    </Paper>
  );
};
