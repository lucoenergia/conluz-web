import { useEffect, useRef, useState, type FC, type SyntheticEvent } from "react";
import { Box, Typography } from "@mui/material";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import { AppModal } from "./AppModal";
import { ConfirmationActions } from "./ConfirmationActions";
import { alphas, colors, fontSizes, radii } from "../../theme/tokens";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { getCoefficientCupsLabel } from "../../pages/production/sharingAgreementCoefficientState";
import { dateChanged, getCoefficientDateDisabledReason } from "../../pages/production/coefficientDateValidation";
import { CoefficientDialogErrorPanel, CoefficientTargetSummary } from "./coefficientLifecycleDialogHelpers";
import { CommunityScopeHeader } from "../CommunityScopeHeader";
import { communityLabel, useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import { LoadErrorAlert } from "../LoadErrorAlert";
import { isCoefficientDateValid } from "../../pages/production/coefficientDateValidation";

/** A supply the activation closes because it is absent from the agreement. */
export interface LeavingSupplyClosure {
  supplyId: string;
  /** The supply's name, or its CUPS when it has none. */
  label: string;
  code: string;
  previousAgreementName: string;
  /** The day its coefficient is closed on, "dd/mm/aaaa". */
  closedOn: string;
}

/**
 * Which supplies the activation at the chosen date closes, as a dry run of it
 * answers (UI-AGR-037). `waiting` until a valid date is chosen.
 */
export type LeavingSuppliesPreview =
  | { status: "waiting" }
  | { status: "loading" }
  | { status: "ready"; closures: LeavingSupplyClosure[] }
  | { status: "refused"; messages: string[] }
  | { status: "failed"; onRetry: () => void };

interface ApplyCoefficientDateConfirmationModalProps {
  isOpen: boolean;
  coefficients: readonly [SharingAgreementPartitionCoefficientResponse, ...SharingAgreementPartitionCoefficientResponse[]] | undefined;
  /** How many of `coefficients` are currently hidden by the filter behind the modal — 0 for the row path, since a hidden row can never open its own menu. */
  hiddenCount?: number;
  isPending: boolean;
  errorMessages: string[] | null;
  onCancel: (event?: SyntheticEvent) => void;
  onConfirm: (date: Dayjs) => void;
  /**
   * The supplies an activation at the chosen date closes (UI-AGR-037). When
   * given, "Registrar fecha" waits for it: confirming is offered only once
   * the list is known.
   */
  leavingSupplies?: LeavingSuppliesPreview;
  /** Reports each change of the date field, and whether the day it holds is usable. */
  onDateChange?: (date: Dayjs | null, isValid: boolean) => void;
}

/** Why "Registrar fecha" waits on the leaving supplies, or null once they are known. */
function leavingSuppliesBlocker(preview: LeavingSuppliesPreview | undefined): string | null {
  switch (preview?.status) {
    case "loading":
      return "Calculando qué puntos salen del reparto…";
    case "refused":
      return "Con esta fecha no se puede registrar: revisa los errores.";
    case "failed":
      return "No se pudo calcular qué puntos salen del reparto.";
    default:
      return null;
  }
}

const LeavingSuppliesList: FC<{ preview: LeavingSuppliesPreview | undefined }> = ({ preview }) => {
  if (preview?.status === "failed") {
    return (
      <Box sx={{ mt: 2 }}>
        <LoadErrorAlert message="No se pudo calcular qué puntos salen del reparto." onRetry={preview.onRetry} />
      </Box>
    );
  }
  if (preview?.status !== "ready" || preview.closures.length === 0) return null;
  return (
    <Box component="section" aria-labelledby="activation-leaving-supplies" sx={{ mt: 2 }}>
      <Typography id="activation-leaving-supplies" component="h3" sx={{ fontWeight: 700, fontSize: fontSizes.lg }}>
        Salen del reparto ({preview.closures.length})
      </Typography>
      <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 0.5, mb: 1 }}>
        Tienen un coeficiente en otro acuerdo y no están en este. Su coeficiente se cierra en esta fecha.
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5, maxHeight: 200, overflowY: "auto" }}>
        {preview.closures.map((closure) => (
          <li key={closure.supplyId}>
            <Typography variant="body2">
              <strong>{closure.label}</strong> · {closure.previousAgreementName} · se cierra el {closure.closedOn}
            </Typography>
          </li>
        ))}
      </Box>
    </Box>
  );
};

// Registering a date is the expected, first-time operation for a PENDING
// coefficient — unlike "correct"/"deactivate"/"close"/"reopen", nothing here
// is retroactively rewriting an already-attributed period, so this dialog
// carries no consequence warning, no error-toned icon or CUPS chip. Same
// underlying activate endpoint as "correct" (see the container's
// handleConfirmActivate), same shared date-validation rule, different intent.
// The confirm button swaps its label for a spinner while pending — the one
// coefficient dialog that does, because it directly succeeds Part A's batch
// bar button, which had the same spinner-swap.
export const ApplyCoefficientDateConfirmationModal: FC<ApplyCoefficientDateConfirmationModalProps> = ({
  isOpen,
  coefficients,
  hiddenCount = 0,
  isPending,
  errorMessages,
  onCancel,
  onConfirm,
  leavingSupplies,
  onDateChange,
}) => {
  const communityName = useActiveCommunityName();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);
  // The field always opens empty.
  const initialDate = null;

  // Fresh date field every time the dialog opens — never carries over a
  // previous coefficient's selection.
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(null);
      setDateValidationError(null);
    }
  }, [isOpen]);

  const confirmDisabledReason =
    getCoefficientDateDisabledReason(selectedDate, dateValidationError, isPending, "Registrando…") ??
    leavingSuppliesBlocker(leavingSupplies);

  // Reported once per day the field settles on, after the picker's own
  // validation for it: a change and the error it raises arrive as two events.
  const isSelectedDateValid = isCoefficientDateValid(selectedDate, dateValidationError);
  const selectedDay = selectedDate?.isValid() ? selectedDate.format("YYYY-MM-DD") : null;
  const reportDateChange = useRef(onDateChange);
  reportDateChange.current = onDateChange;
  useEffect(() => {
    if (!isOpen) return;
    reportDateChange.current?.(selectedDay === null ? null : dayjs(selectedDay), isSelectedDateValid);
  }, [isOpen, selectedDay, isSelectedDateValid]);

  const handleConfirm = () => {
    if (!selectedDate || confirmDisabledReason) return;
    onConfirm(selectedDate);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onCancel}
      size="compact"
      dirty={dateChanged(selectedDate, initialDate)}
      dismissible={!isPending}
      title={`Registrar fecha de aplicación en ${communityLabel(communityName)}`}
      scopeHeader={<CommunityScopeHeader name={communityName} />}
      icon={<EventAvailableOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alphas.info.light}
      actions={
        <ConfirmationActions
          onConfirm={handleConfirm}
          confirmLabel="Registrar fecha"
          confirmColor="primary"
          confirmDisabled={confirmDisabledReason !== null}
          confirmPending={isPending}
          inFlight={isPending}
        />
      }
    >
      {coefficients && coefficients.length > 1 ? (
        <CoefficientTargetSummary coefficients={coefficients} hiddenCount={hiddenCount} />
      ) : (
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
      )}
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <DesktopDatePicker
          label="Fecha de aplicación"
          value={selectedDate}
          onChange={setSelectedDate}
          maxDate={dayjs()}
          onError={(reason) => setDateValidationError(reason)}
          readOnly={isPending}
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
      <LeavingSuppliesList preview={leavingSupplies} />
      <CoefficientDialogErrorPanel
        errorMessages={leavingSupplies?.status === "refused" ? leavingSupplies.messages : errorMessages}
      />
    </AppModal>
  );
};
