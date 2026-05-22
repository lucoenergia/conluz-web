import { useState, useRef } from "react";
import type { FC } from "react";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ErrorIcon from "@mui/icons-material/Error";
import { BasicModal } from "./BasicModal";
import { useCreateSuppliesWithFile } from "../../api/supplies/supplies";
import type { CreationInBulkResponse } from "../../api/models";
import { radii, shadows } from "../../theme/tokens";

interface ImportSuppliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

type Step = "upload" | "uploading" | "results";

export const ImportSuppliesModal: FC<ImportSuppliesModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CreationInBulkResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = useTheme();
  const mutation = useCreateSuppliesWithFile();

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
    <BasicModal isOpen={isOpen} onClose={handleClose}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {step === "upload" && (
          <>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "Inter, sans-serif",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#1e293b",
                mb: 3,
              }}
            >
              Importar Puntos de Suministro desde CSV
            </Typography>

            <Box
              onClick={handleDropZoneClick}
              data-testid="drop-zone"
              sx={{
                border: "2px dashed",
                borderColor: file ? theme.palette.primary.main : "#d1d5db",
                borderRadius: radii.default,
                p: 4,
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: file
                  ? alpha(theme.palette.primary.main, 0.04)
                  : "#f9fafb",
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
                  color: file ? theme.palette.primary.main : "#9ca3af",
                  mb: 1,
                }}
              />
              {file ? (
                <Typography
                  sx={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "0.9375rem",
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
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.9375rem",
                      color: "#475569",
                      mb: 0.5,
                    }}
                  >
                    Haz clic para seleccionar un archivo CSV
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.8125rem",
                      color: "#9ca3af",
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
                fontFamily: "Inter, sans-serif",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#475569",
                mb: 1,
              }}
            >
              Formato esperado del CSV:
            </Typography>
            <Box
              sx={{
                backgroundColor: "#f8fafc",
                borderRadius: radii.small,
                p: 1.5,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "#475569",
                  lineHeight: 1.8,
                }}
              >
                code, address, partitionCoefficient, personalId
              </Typography>
            </Box>

            {uploadError && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  borderRadius: radii.small,
                  p: 1.5,
                  mb: 2,
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 20, color: "#ef4444" }} />
                <Typography
                  sx={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "0.8125rem",
                    color: "#ef4444",
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
                  textTransform: "none",
                  minWidth: "100px",
                  padding: "8px 20px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.9375rem",
                  borderRadius: radii.default,
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
                  textTransform: "none",
                  minWidth: "120px",
                  padding: "8px 20px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.9375rem",
                  borderRadius: radii.default,
                  backgroundColor: theme.palette.primary.main,
                  boxShadow: shadows.medium,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                    boxShadow: shadows.strong,
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "#e5e7eb",
                    color: "#9ca3af",
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
                fontFamily: "Inter, sans-serif",
                fontSize: "1rem",
                color: "#475569",
              }}
            >
              Importando puntos de suministro...
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
                      ? "rgba(245, 158, 11, 0.1)"
                      : "rgba(16, 185, 129, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                {errors.length > 0 ? (
                  <ErrorOutlineIcon sx={{ fontSize: 40, color: "#f59e0b" }} />
                ) : (
                  <CheckCircleIcon sx={{ fontSize: 40, color: "#10b981" }} />
                )}
              </Box>

              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: "#1e293b",
                  mb: 1,
                }}
              >
                Importación completada
              </Typography>

              <Typography
                sx={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.9375rem",
                  color: "#475569",
                }}
              >
                Se ha{createdCount !== 1 ? "n" : ""} creado {createdCount}{" "}
                punto{createdCount !== 1 ? "s" : ""} de suministro
                {createdCount !== 1 ? "" : ""}
              </Typography>
            </Box>

            {errors.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "#ef4444",
                    mb: 1,
                  }}
                >
                  Errores ({errors.length}):
                </Typography>
                <Box
                  sx={{
                    maxHeight: 150,
                    overflowY: "auto",
                    backgroundColor: "#fef2f2",
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
                          color: "#ef4444",
                          mt: 0.3,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "0.8125rem",
                          color: "#ef4444",
                        }}
                      >
                        {err.item != null && (
                          <strong>{String(err.item)}: </strong>
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
                  textTransform: "none",
                  minWidth: "140px",
                  padding: "8px 20px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.9375rem",
                  borderRadius: radii.default,
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
                  textTransform: "none",
                  minWidth: "100px",
                  padding: "8px 20px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.9375rem",
                  borderRadius: radii.default,
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
      </Box>
    </BasicModal>
  );
};
