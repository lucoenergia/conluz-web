import { useState, useRef } from "react";
import type { FC } from "react";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ErrorIcon from "@mui/icons-material/Error";
import { AppModal } from "./AppModal";
import { useCreateUsersWithFile } from "../../api/users/users";
import type { CreateUsersInBulkResponse } from "../../api/models";
import { radii, shadows, alphas, colors, fontSizes } from "../../theme/tokens";

interface ImportPartnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

type Step = "upload" | "uploading" | "results";

export const ImportPartnersModal: FC<ImportPartnersModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CreateUsersInBulkResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = useTheme();
  const mutation = useCreateUsersWithFile();

  const reset = () => {
    setStep("upload");
    setFile(null);
    setResult(null);
    setUploadError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError(null);
    }
  };

  const handleImport = () => {
    if (!file) return;

    setStep("uploading");
    setUploadError(null);

    mutation.mutate(
      { data: { file } },
      {
        onSuccess: (data) => {
          setResult(data);
          setStep("results");
          onImportComplete?.();
        },
        onError: () => {
          setUploadError(
            "Error al importar el archivo. Verifica el formato CSV e inténtalo de nuevo."
          );
          setStep("upload");
        },
      }
    );
  };

  const handleImportAnother = () => {
    reset();
  };

  const createdCount = result?.created?.length || 0;
  const errors = result?.errors || [];

  return (
    <AppModal isOpen={isOpen} onClose={handleClose}>
      {step === "upload" && (
        <>
          <Typography
            variant="h6"
            sx={{ color: "text.primary", mb: 3 }}
          >
            Importar Socios desde CSV
          </Typography>

          <Box
            onClick={handleDropZoneClick}
            data-testid="drop-zone"
            sx={{
              border: "2px dashed",
              borderColor: file ? theme.palette.primary.main : colors.border.inactive,
              borderRadius: radii.default,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: file
                ? alpha(theme.palette.primary.main, 0.04)
                : colors.background.inactive,
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
              },
              mb: 3,
            }}
          >
            <CloudUploadIcon
              sx={{
                fontSize: 48,
                color: file ? theme.palette.primary.main : colors.text.muted,
                mb: 1,
              }}
            />
            {file ? (
              <Typography
                sx={{
                  fontSize: fontSizes.lg,
                  fontWeight: 600,
                  color: theme.palette.primary.main,
                }}
              >
                {file.name}
              </Typography>
            ) : (
              <>
                <Typography
                  sx={{
                    fontSize: fontSizes.lg,
                    color: "secondary.main",
                    mb: 0.5,
                  }}
                >
                  Haz clic para seleccionar un archivo CSV
                </Typography>
                <Typography
                  sx={{
                    fontSize: fontSizes.sm,
                    color: colors.text.muted,
                  }}
                >
                  Solo archivos .csv
                </Typography>
              </>
            )}
          </Box>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            data-testid="csv-file-input"
            hidden
          />

          <Typography
            sx={{
              fontSize: fontSizes.md,
              fontWeight: 600,
              color: "secondary.main",
              mb: 1,
            }}
          >
            Formato esperado del CSV:
          </Typography>
          <Box
            sx={{
              backgroundColor: colors.background.surface,
              borderRadius: radii.small,
              p: 1.5,
              mb: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: "monospace",
                fontSize: fontSizes.xs,
                color: "secondary.main",
                lineHeight: 1.8,
              }}
            >
              number, fullName, personalId, address, email, phoneNumber,
              role, password
            </Typography>
          </Box>

          {uploadError && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                backgroundColor: alphas.error.subtle,
                borderRadius: radii.small,
                p: 1.5,
                mb: 2,
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 20, color: "error.main" }} />
              <Typography
                sx={{
                  fontSize: fontSizes.sm,
                  color: "error.main",
                }}
              >
                {uploadError}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
              pt: 2,
            }}
          >
            <Button
              variant="outlined"
              onClick={handleClose}
              sx={{
                minWidth: "100px",
                padding: "8px 20px",
                fontSize: fontSizes.lg,
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                "&:hover": {
                  borderColor: theme.palette.primary.dark,
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={!file}
              onClick={handleImport}
              sx={{
                minWidth: "120px",
                padding: "8px 20px",
                fontSize: fontSizes.lg,
                backgroundColor: theme.palette.primary.main,
                boxShadow: shadows.medium,
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                  boxShadow: shadows.strong,
                },
                "&.Mui-disabled": {
                  backgroundColor: colors.divider,
                  color: colors.text.muted,
                },
              }}
            >
              Importar
            </Button>
          </Box>
        </>
      )}

      {step === "uploading" && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress sx={{ color: theme.palette.primary.main, mb: 2 }} />
          <Typography
            sx={{
              fontSize: fontSizes.xl,
              color: "secondary.main",
            }}
          >
            Importando socios...
          </Typography>
        </Box>
      )}

      {step === "results" && (
        <>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor:
                  errors.length > 0
                    ? alphas.warning.light
                    : alphas.success.light,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
              }}
            >
              {errors.length > 0 ? (
                <ErrorOutlineIcon sx={{ fontSize: 40, color: "warning.main" }} />
              ) : (
                <CheckCircleIcon sx={{ fontSize: 40, color: "success.main" }} />
              )}
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontSize: fontSizes["2xl"],
                color: "text.primary",
                mb: 1,
              }}
            >
              Importación completada
            </Typography>

            <Typography
              sx={{
                fontSize: fontSizes.lg,
                color: "secondary.main",
              }}
            >
              Se ha{createdCount !== 1 ? "n" : ""} creado {createdCount}{" "}
              socio{createdCount !== 1 ? "s" : ""}
            </Typography>
          </Box>

          {errors.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontSize: fontSizes.md,
                  fontWeight: 600,
                  color: "error.main",
                  mb: 1,
                }}
              >
                Errores ({errors.length}):
              </Typography>
              <Box
                sx={{
                  maxHeight: 150,
                  overflowY: "auto",
                  backgroundColor: colors.background.errorFaint,
                  borderRadius: radii.small,
                  p: 1.5,
                }}
              >
                {errors.map((err, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      py: 0.5,
                    }}
                  >
                    <ErrorIcon
                      sx={{
                        fontSize: 16,
                        color: "error.main",
                        mt: 0.3,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: fontSizes.sm,
                        color: "error.main",
                      }}
                    >
                      {err.personalId && (
                        <strong>{err.personalId}: </strong>
                      )}
                      {err.errorMessage}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            <Button
              variant="outlined"
              onClick={handleImportAnother}
              sx={{
                minWidth: "140px",
                padding: "8px 20px",
                fontSize: fontSizes.lg,
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                "&:hover": {
                  borderColor: theme.palette.primary.dark,
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              Importar otro archivo
            </Button>
            <Button
              variant="contained"
              onClick={handleClose}
              sx={{
                minWidth: "100px",
                padding: "8px 20px",
                fontSize: fontSizes.lg,
                backgroundColor: theme.palette.primary.main,
                boxShadow: shadows.medium,
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                  boxShadow: shadows.strong,
                },
              }}
            >
              Cerrar
            </Button>
          </Box>
        </>
      )}
    </AppModal>
  );
};
