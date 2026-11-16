import { useState, type FC } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { esES } from "@mui/x-date-pickers/locales";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import { alpha, useTheme } from "@mui/material/styles";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { AppModal } from "../Modals/AppModal";
import { ModalCancelButton } from "../Modals/ModalCancelButton";
import { sxStyles } from "../../theme/sx";
import { fontSizes, shadows } from "../../theme/tokens";
import { formatDecimalForInput, parseDecimalInput } from "../../utils/parseDecimalInput";
import { CommunityScopeHeader } from "../CommunityScopeHeader";
import { communityLabel, useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import { Notice } from "../Notice";
import { ActionStatus } from "../ActionStatus";
import { todayInAppTimeZone } from "../../utils/zonedTime";
import { DISTRIBUTOR_FILE_SENT_ON_IN_FUTURE_MESSAGE } from "../../errors/sharingAgreementFileCopy";

export interface SharingAgreementFormValues {
  name: string;
  /** `null` when left empty. */
  notes: string | null;
  nominalPowerKW: number;
  /**
   * A local date ("2026-03-01"), or `null` when the field is empty. Always
   * `null` in create mode, which does not offer the field.
   */
  distributorFileSentOn: string | null;
}

export interface SharingAgreementFormInitialValues {
  name?: string;
  notes?: string;
  nominalPowerKW?: number;
  distributorFileSentOn?: string | null;
}

/** Refusals the dialog shows on an input, keyed by the input. */
export interface SharingAgreementFormFieldErrors {
  distributorFileSentOn?: string;
}

export interface SharingAgreementFormDialogProps {
  isOpen: boolean;
  mode: "create" | "edit";
  /** Only used in create mode, for the "se creará para {plantName}" intro line. */
  plantName?: string;
  initialValues?: SharingAgreementFormInitialValues;
  /** When true, warns if the capacity value is changed — the agreement already has coefficients whose kW interpretation depends on it. */
  hasCoefficients?: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  /**
   * Resolves to the refusals to show on their inputs when the save is refused
   * there; the dialog then stays open with what was typed.
   */
  onSubmit: (values: SharingAgreementFormValues) => void | Promise<SharingAgreementFormFieldErrors | void>;
}

const NAME_REQUIRED_MESSAGE = "El nombre es obligatorio";
const SENT_ON_INVALID_MESSAGE = "Introduce una fecha válida";
const LOCAL_DATE_FORMAT = "YYYY-MM-DD";
const CAPACITY_INVALID_MESSAGE = "Introduce una potencia en kW mayor que 0";
// Compare capacity values at 0.001 kW granularity so retyping the same figure in a
// different textual form (e.g. "150" vs "150,00") never registers as a change.
const CAPACITY_COMPARISON_SCALE = 1000;

function isCapacityValid(raw: string): boolean {
  const value = parseDecimalInput(raw);
  return !isNaN(value) && value > 0;
}

function toComparableCapacity(value: number): number {
  return Math.round(value * CAPACITY_COMPARISON_SCALE);
}

/**
 * The picker's value as the API writes it, or `null` when empty. dayjs reads
 * and writes "YYYY-MM-DD" as the device's own calendar day, so a local date
 * makes the round trip unchanged whatever the device's time zone.
 */
function toLocalDate(value: Dayjs | null): string | null {
  return value && value.isValid() ? value.format(LOCAL_DATE_FORMAT) : null;
}

/**
 * Why the sent date cannot be saved, or `undefined` when it can. "Today" is
 * the app's time zone's, as the backend's is, not the device's.
 */
function sentOnErrorOf(value: Dayjs | null): string | undefined {
  if (value === null) return undefined;
  if (!value.isValid()) return SENT_ON_INVALID_MESSAGE;
  if (value.format(LOCAL_DATE_FORMAT) > todayInAppTimeZone()) return DISTRIBUTOR_FILE_SENT_ON_IN_FUTURE_MESSAGE;
  return undefined;
}


const CAPACITY_CHANGE_NOTICE =
  "Cambiar la potencia nominal no modifica los coeficientes ya guardados, pero sí cambia la potencia en kW que corresponde a cada suministro según esos coeficientes.";

export const SharingAgreementFormDialog: FC<SharingAgreementFormDialogProps> = ({
  isOpen,
  mode,
  plantName,
  initialValues,
  hasCoefficients = false,
  isSubmitting = false,
  onCancel,
  onSubmit,
}) => {
  const communityName = useActiveCommunityName();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [capacityInput, setCapacityInput] = useState(
    initialValues?.nominalPowerKW !== undefined ? formatDecimalForInput(initialValues.nominalPowerKW) : "",
  );
  const [sentOn, setSentOn] = useState<Dayjs | null>(() =>
    initialValues?.distributorFileSentOn ? dayjs(initialValues.distributorFileSentOn) : null,
  );
  const [initial] = useState(() => ({
    name: initialValues?.name ?? "",
    notes: initialValues?.notes ?? "",
    capacity: initialValues?.nominalPowerKW !== undefined ? formatDecimalForInput(initialValues.nominalPowerKW) : "",
    sentOn: initialValues?.distributorFileSentOn ?? null,
  }));
  // A half-typed date is not valid yet, and not equal to the stored one either.
  const sentOnChanged = sentOn !== null && !sentOn.isValid() ? true : toLocalDate(sentOn) !== initial.sentOn;
  const dirty =
    name !== initial.name || notes !== initial.notes || capacityInput !== initial.capacity || (mode === "edit" && sentOnChanged);
  const [nameError, setNameError] = useState<string | undefined>();
  const [capacityError, setCapacityError] = useState<string | undefined>();
  const [sentOnError, setSentOnError] = useState<string | undefined>();
  // Today in the app's time zone, read once per render so the picker's upper
  // bound and the submit check agree.
  const today = todayInAppTimeZone();
  const theme = useTheme();

  const parsedCapacity = parseDecimalInput(capacityInput);
  const capacityChanged =
    hasCoefficients &&
    initialValues?.nominalPowerKW !== undefined &&
    isCapacityValid(capacityInput) &&
    toComparableCapacity(parsedCapacity) !== toComparableCapacity(initialValues.nominalPowerKW);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setName(value);
    if (nameError && value.trim()) setNameError(undefined);
  };

  const handleCapacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCapacityInput(value);
    if (capacityError && isCapacityValid(value)) setCapacityError(undefined);
  };

  const handleSentOnChange = (value: Dayjs | null) => {
    setSentOn(value);
    // A refusal said about the previous date no longer applies to this one.
    setSentOnError(undefined);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const capacityValid = isCapacityValid(capacityInput);
    const sentOnInvalid = mode === "edit" ? sentOnErrorOf(sentOn) : undefined;

    let valid = true;
    if (!trimmedName) {
      setNameError(NAME_REQUIRED_MESSAGE);
      valid = false;
    }
    if (!capacityValid) {
      setCapacityError(CAPACITY_INVALID_MESSAGE);
      valid = false;
    }
    if (sentOnInvalid) {
      setSentOnError(sentOnInvalid);
      valid = false;
    }
    if (!valid) return;

    const refused = await onSubmit({
      name: trimmedName,
      notes: notes.trim() || null,
      nominalPowerKW: parseDecimalInput(capacityInput),
      distributorFileSentOn: mode === "edit" ? toLocalDate(sentOn) : null,
    });
    if (refused?.distributorFileSentOn) setSentOnError(refused.distributorFileSentOn);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onCancel}
      dismissible={!isSubmitting}
      dirty={dirty}
      title={`${mode === "create" ? "Nuevo" : "Editar"} acuerdo de reparto en ${communityLabel(communityName)}`}
      scopeHeader={<CommunityScopeHeader name={communityName} />}
      icon={<HandshakeOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alpha(theme.palette.primary.main, 0.12)}
      actions={
        <>
          <ModalCancelButton disabled={isSubmitting} />
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            sx={{
              minWidth: "64px",
              padding: "5px 15px",
              fontSize: fontSizes.lg,
              boxShadow: shadows.medium,
              "&:hover": { boxShadow: shadows.strong },
            }}
          >
            {mode === "create" ? "Crear borrador" : "Guardar cambios"}
          </Button>
        </>
      }
    >
      {/* In place from the moment the dialog opens, so the explanation is announced when a capacity edit brings it. */}
      <ActionStatus message={capacityChanged ? CAPACITY_CHANGE_NOTICE : ""} />
      <Box>
        {mode === "create" && (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Se creará para <strong>{plantName || "la planta"}</strong> en estado <strong>Borrador</strong>. Desde
              ahí podrás elegir entre dos caminos: adjuntar el fichero TXT que ya tengas hecho por otro medio, o
              introducir los coeficientes a mano — generar el fichero para la distribuidora es opcional y está
              disponible en cualquier momento del borrador.
            </Typography>

            <Notice icon={<LockOutlinedIcon fontSize="small" />} severity="info" sx={{ mb: 3 }}>
              Al <strong>poner en vigor</strong>, el conjunto de coeficientes queda fijo para siempre — cualquier
              cambio futuro requerirá un nuevo acuerdo. Después de ponerlo en vigor solo podrás registrar cuándo la
              distribuidora aplica cada coeficiente.
            </Notice>
          </>
        )}

        <Box sx={sxStyles.flexColumnGap3}>
          <TextField
            label="Potencia nominal (kW)"
            placeholder="Ej. 150"
            value={capacityInput}
            onChange={handleCapacityChange}
            error={capacityError !== undefined}
            helperText={capacityError ?? "La potencia nominal de la planta en el momento de este acuerdo."}
            required
            autoFocus
            fullWidth
            variant="outlined"
            slotProps={{
              htmlInput: { inputMode: "decimal", readOnly: isSubmitting },
            }}
          />

          {capacityChanged && (
            <Notice severity="info">{CAPACITY_CHANGE_NOTICE}</Notice>
          )}

          <TextField
            label="Nombre del acuerdo"
            placeholder="Ej. Recálculo julio 2026"
            value={name}
            onChange={handleNameChange}
            error={nameError !== undefined}
            helperText={nameError}
            required
            fullWidth
            variant="outlined"
            slotProps={{ htmlInput: { maxLength: 100, readOnly: isSubmitting } }}
          />

          <TextField
            label="Notas internas"
            placeholder="Motivo del nuevo reparto, cambios respecto al anterior, etc."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            slotProps={{ htmlInput: { maxLength: 500, readOnly: isSubmitting } }}
          />

          {/* Recorded once the file is sent, so not offered on create (#417). */}
          {mode === "edit" && (
            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              adapterLocale="es"
              localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}
            >
              <DesktopDatePicker
                label="Fecha de envío del fichero a la distribuidora"
                value={sentOn}
                onChange={handleSentOnChange}
                maxDate={dayjs(today)}
                readOnly={isSubmitting}
                slotProps={{
                  field: { clearable: !isSubmitting },
                  textField: {
                    fullWidth: true,
                    error: sentOnError !== undefined,
                    helperText: sentOnError,
                  },
                }}
              />
            </LocalizationProvider>
          )}
        </Box>
      </Box>
    </AppModal>
  );
};
