import { useEffect, useState, type FC } from "react";
import { useMutation } from "@tanstack/react-query";
import { Box, Button, Paper, Typography } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { useErrorDispatch } from "../../context/error.context";
import { isNotFoundError } from "../../pages/production/useSharingAgreementsData";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";
import { downloadSharingAgreementFile } from "./downloadSharingAgreementFile";
import { SharingAgreementUploadDialog } from "../SharingAgreementUploadDialog";

export interface SharingAgreementFilePanelProps {
  plantId: string;
  sharingAgreementId: string;
  agreementStatus: StatusValue | undefined;
  plantRegulatoryCode: string | undefined;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const SharingAgreementFilePanel: FC<SharingAgreementFilePanelProps> = ({
  plantId,
  sharingAgreementId,
  agreementStatus,
  plantRegulatoryCode,
}) => {
  const errorDispatch = useErrorDispatch();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const downloadMutation = useMutation({
    mutationFn: () => downloadSharingAgreementFile(plantId, sharingAgreementId),
    onSuccess: ({ blob, filename }) => triggerBrowserDownload(blob, filename),
  });

  const fileNotFound = downloadMutation.isError && isNotFoundError(downloadMutation.error);

  useEffect(() => {
    if (downloadMutation.isError && !isNotFoundError(downloadMutation.error)) {
      errorDispatch("Ha habido un problema al descargar el fichero. Por favor, inténtalo más tarde");
    }
  }, [downloadMutation.isError, downloadMutation.error, errorDispatch]);

  return (
    <Paper elevation={0} sx={sxStyles.softPanel}>
      <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
        Fichero adjunto
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        {fileNotFound ? (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <DescriptionOutlinedIcon sx={{ color: colors.text.subtle, fontSize: 24 }} />
            <Typography variant="body2" color="text.secondary">
              {agreementStatus === SharingAgreementResponseStatus.DRAFT
                ? "Este acuerdo todavía no tiene un fichero adjunto. Podrás adjuntarlo o generarlo más adelante."
                : "No hay fichero adjunto. Este acuerdo es anterior al sistema de gestión de ficheros — es una situación legítima y permanente."}
            </Typography>
          </Box>
        ) : (
          <Button
            variant="outlined"
            startIcon={<DownloadOutlinedIcon />}
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending}
          >
            {downloadMutation.isPending ? "Descargando…" : "Descargar fichero"}
          </Button>
        )}

        {agreementStatus === SharingAgreementResponseStatus.DRAFT && (
          <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => setIsUploadDialogOpen(true)}>
            Subir fichero
          </Button>
        )}
      </Box>

      <SharingAgreementUploadDialog
        isOpen={isUploadDialogOpen}
        plantId={plantId}
        sharingAgreementId={sharingAgreementId}
        regulatoryCode={plantRegulatoryCode}
        onClose={() => setIsUploadDialogOpen(false)}
        onUploadSuccess={() => downloadMutation.reset()}
      />
    </Paper>
  );
};
