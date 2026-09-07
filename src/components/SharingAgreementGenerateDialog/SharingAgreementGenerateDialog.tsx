import { useState, type ChangeEvent, type FC } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { AppModal } from "../Modals/AppModal";
import { fontSizes, shadows } from "../../theme/tokens";
import { useGenerateSharingAgreementDistributorFile } from "../../api/sharing-agreements/sharing-agreements";
import { useErrorDispatch } from "../../context/error.context";
import { getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import { triggerBrowserDownload } from "../SharingAgreementFilePanel/downloadSharingAgreementFile";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export interface SharingAgreementGenerateDialogProps {
  isOpen: boolean;
  plantId: string;
  sharingAgreementId: string;
  /** Caller only opens this dialog when Generate wasn't disabled, so the plant is known to have one. */
  regulatoryCode: string;
  onClose: () => void;
  onGenerateSuccess?: () => void;
}

function isYearInRange(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
}

export const SharingAgreementGenerateDialog: FC<SharingAgreementGenerateDialogProps> = ({
  isOpen,
  plantId,
  sharingAgreementId,
  regulatoryCode,
  onClose,
  onGenerateSuccess,
}) => {
  const theme = useTheme();
  const errorDispatch = useErrorDispatch();
  const generateMutation = useGenerateSharingAgreementDistributorFile();

  const [year, setYear] = useState(() => new Date().getFullYear());

  const yearIsValid = isYearInRange(year);
  const filename = `${regulatoryCode}_${year}.txt`;

  const reset = () => {
    setYear(new Date().getFullYear());
    generateMutation.reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    setYear(Number(event.target.value));
  };

  const handleConfirm = async () => {
    try {
      // The generated hook's customInstance wrapper discards Content-Disposition
      // (same open issue as downloadSharingAgreementFile.ts), so the filename is
      // built client-side from the same {regulatoryCode}_{year}.txt convention
      // the backend uses — fixing that header issue will require touching this
      // code too.
      const blob = await generateMutation.mutateAsync({ plantId, sharingAgreementId, data: { year } });
      triggerBrowserDownload(blob, filename);
      onGenerateSuccess?.();
      handleClose();
    } catch (error) {
      errorDispatch(getFirstApiErrorMessage(error, "Ha habido un problema al generar el fichero. Por favor, inténtalo más tarde"));
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generar fichero"
      icon={<DescriptionOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alpha(theme.palette.primary.main, 0.12)}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={generateMutation.isPending}
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
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={!yearIsValid || generateMutation.isPending}
            sx={{
              minWidth: "64px",
              padding: "5px 15px",
              fontSize: fontSizes.lg,
              boxShadow: shadows.medium,
              "&:hover": { boxShadow: shadows.strong },
            }}
          >
            {generateMutation.isPending ? "Generando…" : "Generar"}
          </Button>
        </>
      }
    >
      <Box sx={{ pt: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Se generará el fichero <strong>{filename}</strong> a partir de los coeficientes actuales.
        </Typography>

        <TextField
          label="Año"
          type="number"
          value={year}
          onChange={handleYearChange}
          error={!yearIsValid}
          helperText={yearIsValid ? undefined : `Introduce un año entre ${MIN_YEAR} y ${MAX_YEAR}.`}
          slotProps={{ htmlInput: { min: MIN_YEAR, max: MAX_YEAR } }}
          fullWidth
        />
      </Box>
    </AppModal>
  );
};
