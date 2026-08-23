import { useState, type FC } from "react";
import { Box, Button, TextField } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import { AppModal } from "../Modals/AppModal";
import { sxStyles } from "../../theme/sx";
import { fontSizes, shadows } from "../../theme/tokens";
import { formatDecimalForInput, parseDecimalInput } from "./parseDecimalInput";

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
  initialValues?: SharingAgreementFormInitialValues;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: SharingAgreementFormValues) => void;
}

const NAME_REQUIRED_MESSAGE = "El nombre es obligatorio";
const CAPACITY_INVALID_MESSAGE = "Introduce una potencia en kW mayor que 0";

function isCapacityValid(raw: string): boolean {
  const value = parseDecimalInput(raw);
  return !isNaN(value) && value > 0;
}

export const SharingAgreementFormDialog: FC<SharingAgreementFormDialogProps> = ({
  isOpen,
  mode,
  initialValues,
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
            {mode === "create" ? "Crear acuerdo" : "Guardar cambios"}
          </Button>
        </>
      }
    >
      <Box sx={{ maxHeight: "60vh", overflowY: "auto" }}>
        <Box sx={sxStyles.flexColumnGap3}>
          <TextField
            label="Nombre"
            value={name}
            onChange={handleNameChange}
            error={nameError !== undefined}
            helperText={nameError}
            required
            autoFocus
            fullWidth
            variant="outlined"
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />

          <TextField
            label="Potencia instalada (kW)"
            value={capacityInput}
            onChange={handleCapacityChange}
            error={capacityError !== undefined}
            helperText={capacityError}
            required
            fullWidth
            variant="outlined"
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />

          <TextField
            label="Notas"
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
