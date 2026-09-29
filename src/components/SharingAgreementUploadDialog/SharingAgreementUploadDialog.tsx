import { useState, type ChangeEvent, type FC } from "react";
import { Alert, Box, Button, Chip, Divider, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { AppModal } from "../Modals/AppModal";
import { colors, fontSizes, shadows } from "../../theme/tokens";
import type { GroupedApiErrors } from "../../errors/apiErrorCatalogue";
import type { Action, SharingAgreementFileUploadResult } from "../../hooks/actions";

export interface SharingAgreementUploadDialogProps {
  isOpen: boolean;
  /**
   * Required, not optional: the dialog does not decide whether importing is
   * permitted, it is only mounted by a caller that was handed the action.
   */
  uploadFile: Action<[File], SharingAgreementFileUploadResult>;
  regulatoryCode: string | undefined;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export const SharingAgreementUploadDialog: FC<SharingAgreementUploadDialogProps> = ({
  isOpen,
  uploadFile,
  regulatoryCode,
  onClose,
  onUploadSuccess,
}) => {
  const theme = useTheme();

  const [file, setFile] = useState<File | null>(null);
  const [groupedErrors, setGroupedErrors] = useState<GroupedApiErrors | null>(null);

  const expectedFilename = regulatoryCode ? `${regulatoryCode}_AAAA.txt` : undefined;

  const reset = () => {
    setFile(null);
    setGroupedErrors(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const handleChooseAnotherFile = () => {
    setFile(null);
    setGroupedErrors(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    const result = await uploadFile.run(file);
    if (result.success) {
      onUploadSuccess?.();
      handleClose();
      return;
    }
    // `null` means the failure was a single message the actions layer already
    // raised as a toast; a grouped set is the per-line work list this dialog
    // renders instead.
    if (result.groupedErrors) setGroupedErrors(result.groupedErrors);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar un fichero que ya tengas"
      icon={<UploadFileOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alpha(theme.palette.primary.main, 0.12)}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={uploadFile.isPending}
            sx={{
              minWidth: "64px",
              padding: "5px 15px",
              fontSize: fontSizes.lg,
              borderColor: (t) => t.palette.primary.main,
              color: (t) => t.palette.primary.main,
              "&:hover": {
                borderColor: (t) => t.palette.primary.dark,
                backgroundColor: (t) => alpha(t.palette.primary.main, 0.04),
              },
            }}
          >
            {groupedErrors ? "Cerrar" : "Cancelar"}
          </Button>
          {!groupedErrors && regulatoryCode && (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!file || uploadFile.isPending}
              sx={{
                minWidth: "64px",
                padding: "5px 15px",
                fontSize: fontSizes.lg,
                boxShadow: shadows.medium,
                "&:hover": { boxShadow: shadows.strong },
              }}
            >
              {uploadFile.isPending ? "Subiendo…" : "Subir fichero"}
            </Button>
          )}
        </>
      }
    >
      <Box sx={{ maxHeight: "60vh", overflowY: "auto", pt: 1 }}>
        {!regulatoryCode ? (
          <Alert severity="warning">
            Esta planta no tiene código regulatorio (CAU) asignado, por lo que no se puede validar el nombre del
            fichero. Añádelo desde la ficha de la planta antes de importar el fichero.
          </Alert>
        ) : groupedErrors ? (
          <RejectedLinesScreen groupedErrors={groupedErrors} onChooseAnotherFile={handleChooseAnotherFile} />
        ) : (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              El fichero debe llamarse exactamente <strong>{expectedFilename}</strong>, sustituyendo{" "}
              <strong>AAAA</strong> por el año correspondiente.
            </Typography>

            <Alert severity="warning" sx={{ mb: 3 }}>
              Subir un fichero nuevo <strong>sustituye por completo</strong> el conjunto de coeficientes actual del
              acuerdo.
            </Alert>

            <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />} sx={{ mb: 1 }}>
              Seleccionar fichero
              <input type="file" accept=".txt" onChange={handleFileChange} style={{ display: "none" }} />
            </Button>

            {file && (
              <Chip
                label={file.name}
                onDelete={() => setFile(null)}
                sx={{ display: "flex", width: "fit-content", mt: 1 }}
              />
            )}
          </>
        )}
      </Box>
    </AppModal>
  );
};

interface RejectedLinesScreenProps {
  groupedErrors: GroupedApiErrors;
  onChooseAnotherFile: () => void;
}

const RejectedLinesScreen: FC<RejectedLinesScreenProps> = ({ groupedErrors, onChooseAnotherFile }) => {
  return (
    <Box>
      <Alert severity="error" icon={<ErrorOutlineIcon fontSize="small" />} sx={{ mb: 2 }}>
        El fichero no se ha podido importar. No se ha modificado ningún coeficiente del borrador. Corrige el fichero
        en origen y vuelve a intentarlo.
      </Alert>

      {groupedErrors.fileLevel.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Errores del fichero
          </Typography>
          {groupedErrors.fileLevel.map((message, index) => (
            <Typography key={index} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              • {message}
            </Typography>
          ))}
        </Box>
      )}

      {groupedErrors.fileLevel.length > 0 && groupedErrors.lineLevel.length > 0 && <Divider sx={{ my: 2 }} />}

      {groupedErrors.lineLevel.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Errores por línea
          </Typography>
          {groupedErrors.lineLevel.map((entry, index) => (
            <Typography key={index} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              • {entry.message}
            </Typography>
          ))}
        </Box>
      )}

      <Button
        variant="outlined"
        onClick={onChooseAnotherFile}
        sx={{
          mt: 3,
          borderColor: colors.border.light,
        }}
      >
        Elegir otro fichero
      </Button>
    </Box>
  );
};
