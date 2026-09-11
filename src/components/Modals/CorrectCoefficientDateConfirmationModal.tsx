import { useEffect, useState, type FC, type MouseEvent } from "react";
import { Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ConfirmationModal } from "./ConfirmationModal";
import { alphas, colors, fontSizes, radii } from "../../theme/tokens";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { getCoefficientCupsLabel } from "../../pages/production/sharingAgreementCoefficientState";
import { CoefficientDialogErrorPanel } from "./coefficientLifecycleDialogHelpers";

interface CorrectCoefficientDateConfirmationModalProps {
  isOpen: boolean;
  coefficients: readonly [SharingAgreementPartitionCoefficientResponse, ...SharingAgreementPartitionCoefficientResponse[]] | undefined;
  isPending: boolean;
  errorMessages: string[] | null;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: (date: Dayjs) => void;
}

export const CorrectCoefficientDateConfirmationModal: FC<CorrectCoefficientDateConfirmationModalProps> = ({
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

  const isSelectedDateValid =
    selectedDate !== null && selectedDate.isValid() && !selectedDate.isAfter(dayjs(), "day") && dateValidationError === null;
  const confirmDisabledReason = !selectedDate
    ? "Selecciona una fecha"
    : !isSelectedDateValid
      ? "La fecha no puede ser futura ni inválida"
      : isPending
        ? "Guardando…"
        : null;

  const handleConfirm = () => {
    if (!selectedDate || confirmDisabledReason) return;
    onConfirm(selectedDate);
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      confirmLabel="Confirmar y recalcular"
      confirmDisabled={confirmDisabledReason !== null}
      onConfirm={handleConfirm}
      title="Corregir fecha de aplicación"
      icon={<WarningAmberIcon sx={{ fontSize: 28, color: "error.main" }} />}
      iconBg={alphas.error.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.md,
          fontWeight: 600,
          color: "secondary.main",
          mb: 2,
          backgroundColor: alphas.error.subtle,
          padding: "8px 12px",
          borderRadius: radii.default,
        }}
      >
        {getCoefficientCupsLabel(coefficients?.[0])}
      </Typography>
      <Typography sx={{ fontSize: fontSizes.lg, color: "text.secondary", lineHeight: 1.6, mb: 2 }}>
        La producción ya atribuida a este suministro —que puede haberse mostrado o facturado ya— cambiará de forma
        retroactiva a partir de la nueva fecha de aplicación.
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <DatePicker
          label="Nueva fecha de aplicación"
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
