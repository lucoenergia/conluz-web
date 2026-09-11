import { useEffect, useMemo, useState, type FC, type MouseEvent } from "react";
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
import { getCoefficientDateDisabledReason } from "../../pages/production/coefficientDateValidation";
import { formatCalendarDate } from "../../utils/formatCalendarDate";
import { CoefficientDialogErrorPanel, CoefficientTargetSummary } from "./coefficientLifecycleDialogHelpers";

interface CorrectCoefficientDateConfirmationModalProps {
  isOpen: boolean;
  coefficients: readonly [SharingAgreementPartitionCoefficientResponse, ...SharingAgreementPartitionCoefficientResponse[]] | undefined;
  /** How many of `coefficients` are currently hidden by the filter behind the modal — 0 for the row path. */
  hiddenCount?: number;
  isPending: boolean;
  errorMessages: string[] | null;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: (date: Dayjs) => void;
}

export const CorrectCoefficientDateConfirmationModal: FC<CorrectCoefficientDateConfirmationModalProps> = ({
  isOpen,
  coefficients,
  hiddenCount = 0,
  isPending,
  errorMessages,
  onCancel,
  onConfirm,
}) => {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  const isBatch = (coefficients?.length ?? 0) > 1;

  // Distinct current application dates across the batch, compared as
  // formatted calendar dates (never raw validFrom) so two coefficients
  // applied at the same local midnight in different UTC offsets still count
  // as one date, matching how the read path already renders them.
  const distinctDates = useMemo(() => {
    if (!isBatch || !coefficients) return [];
    return Array.from(new Set(coefficients.map((c) => formatCalendarDate(c.validFrom ?? undefined))));
  }, [isBatch, coefficients]);

  // Fresh date field every time the dialog opens — never carries over a
  // previous selection. A batch sharing one current date prefills it (a
  // starting point the admin is likely nudging by a small amount); a batch
  // split across several distinct dates, or a single row, always opens
  // empty — a single row is never prefilled with its own current date.
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(isBatch && distinctDates.length === 1 ? dayjs(coefficients![0].validFrom) : null);
      setDateValidationError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- distinctDates/coefficients recompute every render; only isOpen should retrigger the reset
  }, [isOpen]);

  const confirmDisabledReason = getCoefficientDateDisabledReason(selectedDate, dateValidationError, isPending, "Guardando…");

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
      {isBatch ? (
        <CoefficientTargetSummary coefficients={coefficients!} hiddenCount={hiddenCount} />
      ) : (
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
      )}
      <Typography sx={{ fontSize: fontSizes.lg, color: "text.secondary", lineHeight: 1.6, mb: 2 }}>
        {isBatch
          ? "La producción ya atribuida a estos suministros —que puede haberse mostrado o facturado ya— cambiará de forma retroactiva a partir de la nueva fecha de aplicación."
          : "La producción ya atribuida a este suministro —que puede haberse mostrado o facturado ya— cambiará de forma retroactiva a partir de la nueva fecha de aplicación."}
      </Typography>
      {isBatch && distinctDates.length > 1 && (
        <Typography sx={{ fontSize: fontSizes.md, color: "text.secondary", mb: 2 }}>
          Tienen {distinctDates.length} fechas de aplicación distintas; todas pasarán a la fecha que indiques.
        </Typography>
      )}
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
