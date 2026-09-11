import { useEffect, useState, type FC, type MouseEvent } from "react";
import { Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import { ConfirmationModal } from "./ConfirmationModal";
import { alphas, colors, fontSizes, radii } from "../../theme/tokens";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { getCoefficientCupsLabel } from "../../pages/production/sharingAgreementCoefficientState";
import { getCoefficientDateDisabledReason } from "../../pages/production/coefficientDateValidation";
import { CoefficientDialogErrorPanel } from "./coefficientLifecycleDialogHelpers";

interface ApplyCoefficientDateConfirmationModalProps {
  isOpen: boolean;
  coefficients: readonly [SharingAgreementPartitionCoefficientResponse, ...SharingAgreementPartitionCoefficientResponse[]] | undefined;
  isPending: boolean;
  errorMessages: string[] | null;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: (date: Dayjs) => void;
}

// Registering a date is the expected, first-time operation for a PENDING
// coefficient — unlike "correct"/"deactivate"/"close"/"reopen", nothing here
// is retroactively rewriting an already-attributed period, so this dialog
// carries no consequence warning, no error-toned icon or CUPS chip. Same
// underlying activate endpoint as "correct" (see the container's
// handleConfirmActivate), same shared date-validation rule, different intent.
export const ApplyCoefficientDateConfirmationModal: FC<ApplyCoefficientDateConfirmationModalProps> = ({
  isOpen,
  coefficients,
  isPending,
  errorMessages,
  onCancel,
  onConfirm,
}) => {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  // Fresh date field every time the dialog opens — never carries over a
  // previous coefficient's selection.
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(null);
      setDateValidationError(null);
    }
  }, [isOpen]);

  const confirmDisabledReason = getCoefficientDateDisabledReason(selectedDate, dateValidationError, isPending, "Registrando…");

  const handleConfirm = () => {
    if (!selectedDate || confirmDisabledReason) return;
    onConfirm(selectedDate);
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Registrar fecha"
      confirmColor="primary"
      confirmDisabled={confirmDisabledReason !== null}
      onConfirm={handleConfirm}
      title="Registrar fecha de aplicación"
      icon={<EventAvailableOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alphas.info.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.md,
          fontWeight: 600,
          color: "secondary.main",
          mb: 2,
          backgroundColor: alphas.info.subtle,
          padding: "8px 12px",
          borderRadius: radii.default,
        }}
      >
        {getCoefficientCupsLabel(coefficients?.[0])}
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <DatePicker
          label="Fecha de aplicación"
          value={selectedDate}
          onChange={setSelectedDate}
          maxDate={dayjs()}
          onError={(reason) => setDateValidationError(reason)}
          slotProps={{
            textField: {
              size: "small",
              fullWidth: true,
              helperText: "No se permiten fechas futuras",
            },
          }}
        />
      </LocalizationProvider>
      <Typography variant="caption" sx={{ color: colors.text.subtle, display: "block", minHeight: "1.2em", mt: 0.5 }}>
        {confirmDisabledReason ?? ""}
      </Typography>
      <CoefficientDialogErrorPanel errorMessages={errorMessages} />
    </ConfirmationModal>
  );
};
