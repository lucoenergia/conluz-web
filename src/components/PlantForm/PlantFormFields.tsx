import type { FC, Ref } from "react";
import { TextField, Autocomplete, CircularProgress } from "@mui/material";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { alpha } from "@mui/material/styles";
import "dayjs/locale/es";
import type { SupplyResponse } from "../../api/models";
import { fontSizes } from "../../theme/tokens";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { type PlantFieldValues, type PlantFormField } from "./plantFields";

interface PlantFormFieldsProps {
  values: PlantFieldValues;
  onChange: <K extends keyof PlantFieldValues>(field: K, value: PlantFieldValues[K]) => void;
  /** The supplies the selector offers; the screen decides which. */
  supplies: SupplyResponse[];
  /** The supply `values.supplyCode` names, as the screen resolves it. */
  selectedSupply: SupplyResponse | null;
  suppliesLoading?: boolean;
  /** Editing keeps the plant's supply: it cannot be changed here. */
  disableSupplySelector?: boolean;
  /** An error shown on the input it is about. */
  fieldErrors?: Partial<Record<PlantFormField, string>>;
  /** While a save is in flight, nothing can be changed. */
  readOnly?: boolean;
  /** The inputs an error can be shown on, so the screen can focus one. */
  inputRefs?: Partial<Record<PlantFormField, Ref<HTMLInputElement>>>;
}

/** The plant's inputs, controlled by the screen that holds them. */
export const PlantFormFields: FC<PlantFormFieldsProps> = ({
  values,
  onChange,
  supplies,
  selectedSupply,
  suppliesLoading = false,
  disableSupplySelector = false,
  fieldErrors = {},
  readOnly = false,
  inputRefs = {},
}) => (
  <>
    <TextField
      id="providerCode"
      label="Código de proveedor"
      type="text"
      name="providerCode"
      inputRef={inputRefs.providerCode}
      error={fieldErrors.providerCode !== undefined}
      helperText={fieldErrors.providerCode}
      value={values.providerCode}
      onChange={(e) => onChange("providerCode", e.target.value)}
      slotProps={{ htmlInput: { maxLength: 50, readOnly } }}
      required
      autoFocus
      fullWidth
      variant="outlined"
    />

    <TextField
      id="regulatoryCode"
      label="CAU"
      type="text"
      name="regulatoryCode"
      value={values.regulatoryCode}
      onChange={(e) => onChange("regulatoryCode", e.target.value)}
      slotProps={{ htmlInput: { maxLength: 50, readOnly } }}
      fullWidth
      variant="outlined"
    />

    <TextField
      id="cil"
      label="CIL"
      type="text"
      name="cil"
      inputRef={inputRefs.cil}
      error={fieldErrors.cil !== undefined}
      helperText={fieldErrors.cil}
      value={values.cil}
      onChange={(e) => onChange("cil", e.target.value)}
      // Room for a code pasted with spaces; the form sends it without them.
      slotProps={{ htmlInput: { maxLength: 50, readOnly } }}
      fullWidth
      variant="outlined"
    />

    <TextField
      id="name"
      label="Nombre"
      type="text"
      name="name"
      inputRef={inputRefs.name}
      error={fieldErrors.name !== undefined}
      helperText={fieldErrors.name}
      value={values.name}
      onChange={(e) => onChange("name", e.target.value)}
      slotProps={{ htmlInput: { maxLength: 50, readOnly } }}
      required
      fullWidth
      variant="outlined"
    />

    <Autocomplete
      options={supplies}
      getOptionLabel={(option) => `${supplyDisplayLabel(option)} (${option.code})`}
      value={selectedSupply}
      onChange={(_, newValue) => onChange("supplyCode", newValue?.code ?? null)}
      loading={suppliesLoading}
      disabled={disableSupplySelector}
      readOnly={readOnly}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Punto de suministro"
          required
          variant="outlined"
          inputRef={inputRefs.supplyCode}
          error={fieldErrors.supplyCode !== undefined}
          helperText={fieldErrors.supplyCode}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {suppliesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />

    <TextField
      id="address"
      label="Dirección"
      type="text"
      name="address"
      inputRef={inputRefs.address}
      error={fieldErrors.address !== undefined}
      helperText={fieldErrors.address}
      value={values.address}
      onChange={(e) => onChange("address", e.target.value)}
      slotProps={{ htmlInput: { maxLength: 100, readOnly } }}
      required
      fullWidth
      variant="outlined"
    />

    <TextField
      id="description"
      label="Descripción"
      type="text"
      name="description"
      value={values.description}
      onChange={(e) => onChange("description", e.target.value)}
      slotProps={{ htmlInput: { maxLength: 250, readOnly } }}
      multiline
      rows={3}
      fullWidth
      variant="outlined"
    />

    <TextField
      id="peakPowerKWp"
      label="Potencia pico (kWp)"
      type="number"
      error={fieldErrors.peakPowerKWp !== undefined}
      helperText={fieldErrors.peakPowerKWp}
      name="peakPowerKWp"
      inputRef={inputRefs.peakPowerKWp}
      value={values.peakPowerKWp}
      onChange={(e) => onChange("peakPowerKWp", e.target.value)}
      required
      fullWidth
      variant="outlined"
      slotProps={{
        htmlInput: {
          min: 0,
          step: 0.01,
          readOnly,
        },
      }}
    />

    <TextField
      id="nominalPowerKW"
      label="Potencia nominal (kW)"
      type="number"
      error={fieldErrors.nominalPowerKW !== undefined}
      helperText={fieldErrors.nominalPowerKW}
      name="nominalPowerKW"
      inputRef={inputRefs.nominalPowerKW}
      value={values.nominalPowerKW}
      onChange={(e) => onChange("nominalPowerKW", e.target.value)}
      required
      fullWidth
      variant="outlined"
      slotProps={{
        htmlInput: {
          min: 0,
          step: 0.01,
          readOnly,
        },
      }}
    />

    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <DesktopDatePicker
        label="Fecha de conexión"
        value={values.connectionDate}
        onChange={(value) => onChange("connectionDate", value)}
        readOnly={readOnly}
        slotProps={{
          textField: {
            fullWidth: true,
            size: "small",
            sx: {
              "& .MuiOutlinedInput-root": {
                fontSize: fontSizes.lg,
                height: "40px",
              },
            },
          },
          popper: {
            sx: (theme) => ({
              "& .MuiPickersYear-yearButton.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                "&:focus": {
                  backgroundColor: theme.palette.primary.main,
                },
              },
              "& .MuiPickersMonth-monthButton.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                "&:focus": {
                  backgroundColor: theme.palette.primary.main,
                },
              },
              "& .MuiPickersDay-root.Mui-selected": {
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                "&:focus": {
                  backgroundColor: theme.palette.primary.main,
                },
              },
              "& .MuiPickersYear-yearButton:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
              "& .MuiPickersMonth-monthButton:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
              "& .MuiPickersDay-root:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              },
            }),
          },
        }}
      />
    </LocalizationProvider>
  </>
);
