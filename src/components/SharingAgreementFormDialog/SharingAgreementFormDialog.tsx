import { useState, type FC } from "react";
import { Alert, Box, Button, InputAdornment, TextField, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { AppModal } from "../Modals/AppModal";
import { sxStyles } from "../../theme/sx";
import { fontSizes, shadows } from "../../theme/tokens";
import { formatDecimalForInput, parseDecimalInput } from "../../utils/parseDecimalInput";

export interface SharingAgreementFormValues {
  name: string;
  notes?: string;
  installedPowerKw: number;
}

export interface SharingAgreementFormInitialValues {
  name?: string;
  notes?: string;
  installedPowerKw?: number;
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
  onSubmit: (values: SharingAgreementFormValues) => void;
}

const NAME_REQUIRED_MESSAGE = "El nombre es obligatorio";
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
  const [name, setName] = useState(initialValues?.name ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [capacityInput, setCapacityInput] = useState(
    initialValues?.installedPowerKw !== undefined ? formatDecimalForInput(initialValues.installedPowerKw) : "",
  );
  const [nameError, setNameError] = useState<string | undefined>();
  const [capacityError, setCapacityError] = useState<string | undefined>();
  const theme = useTheme();

  const parsedCapacity = parseDecimalInput(capacityInput);
  const capacityChanged =
    hasCoefficients &&
    initialValues?.installedPowerKw !== undefined &&
    isCapacityValid(capacityInput) &&
    toComparableCapacity(parsedCapacity) !== toComparableCapacity(initialValues.installedPowerKw);

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

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const capacityValid = isCapacityValid(capacityInput);

    let valid = true;
    if (!trimmedName) {
      setNameError(NAME_REQUIRED_MESSAGE);
      valid = false;
    }
    if (!capacityValid) {
      setCapacityError(CAPACITY_INVALID_MESSAGE);
      valid = false;
    }
    if (!valid) return;

    onSubmit({
      name: trimmedName,
      notes: notes.trim() || undefined,
      installedPowerKw: parseDecimalInput(capacityInput),
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onCancel}
      title={mode === "create" ? "Nuevo acuerdo de reparto" : "Editar acuerdo de reparto"}
      icon={<HandshakeOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />}
      iconBg={alpha(theme.palette.primary.main, 0.12)}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
            sx={{
              minWidth: "64px",
              padding: "5px 15px",
              fontSize: fontSizes.lg,
              borderColor: (theme) => theme.palette.primary.main,
              color: (theme) => theme.palette.primary.main,
              "&:hover": {
                borderColor: (theme) => theme.palette.primary.dark,
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
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
      <Box sx={{ maxHeight: "60vh", overflowY: "auto", pt: 1 }}>
        {mode === "create" && (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Se creará para <strong>{plantName || "la planta"}</strong> en estado <strong>Borrador</strong>. Desde
              ahí podrás elegir entre dos caminos: adjuntar el fichero TXT que ya tengas hecho por otro medio, o
              introducir los coeficientes a mano — generar el fichero para la distribuidora es opcional y está
              disponible en cualquier momento del borrador.
            </Typography>

            <Alert icon={<LockOutlinedIcon fontSize="small" />} severity="info" sx={{ mb: 3 }}>
              Al <strong>poner en vigor</strong>, el conjunto de coeficientes queda fijo para siempre — cualquier
              cambio futuro requerirá un nuevo acuerdo. Después de ponerlo en vigor solo podrás registrar cuándo la
              distribuidora aplica cada coeficiente.
            </Alert>
          </>
        )}

        <Box sx={sxStyles.flexColumnGap3}>
          <TextField
            label="Capacidad de generación de la planta"
            placeholder="Ej. 150"
            value={capacityInput}
            onChange={handleCapacityChange}
            error={capacityError !== undefined}
            helperText={capacityError ?? "Potencia pico instalada, en el momento de este acuerdo."}
            required
            autoFocus
            fullWidth
            variant="outlined"
            slotProps={{
              htmlInput: { inputMode: "decimal" },
              input: { endAdornment: <InputAdornment position="end">kW</InputAdornment> },
            }}
          />

          {capacityChanged && (
            <Alert severity="info">
              Cambiar la capacidad no modifica los coeficientes ya guardados, pero sí cambia la potencia
              en kW que corresponde a cada suministro según esos coeficientes.
            </Alert>
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
            slotProps={{ htmlInput: { maxLength: 100 } }}
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
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        </Box>
      </Box>
    </AppModal>
  );
};
