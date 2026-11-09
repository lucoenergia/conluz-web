import type { FC, Ref } from "react";
import { TextField } from "@mui/material";
import type { CommunityFieldValues, CommunityFormInput } from "./communityFields";

interface CommunityFormFieldsProps {
  values: CommunityFieldValues;
  onChange: (field: CommunityFormInput, value: string) => void;
  /** An error shown on the input it is about. */
  fieldErrors?: Partial<Record<CommunityFormInput, string>>;
  /** While a save is in flight, nothing can be changed. */
  readOnly?: boolean;
  /** The inputs an error can be shown on, so the screen can focus one. */
  inputRefs?: Partial<Record<CommunityFormInput, Ref<HTMLInputElement>>>;
}

/** The community's inputs, controlled by the screen that holds them. */
export const CommunityFormFields: FC<CommunityFormFieldsProps> = ({
  values,
  onChange,
  fieldErrors = {},
  readOnly = false,
  inputRefs = {},
}) => (
  <>
    <TextField
      label="Nombre *"
      fullWidth
      value={values.name}
      onChange={(e) => onChange("name", e.target.value)}
      inputRef={inputRefs.name}
      error={!!fieldErrors.name}
      helperText={fieldErrors.name}
      slotProps={{ htmlInput: { readOnly } }}
    />
    <TextField
      label="Código *"
      fullWidth
      value={values.code}
      onChange={(e) => onChange("code", e.target.value)}
      inputRef={inputRefs.code}
      error={!!fieldErrors.code}
      helperText={fieldErrors.code || "Identificador corto único para la comunidad"}
      slotProps={{ htmlInput: { readOnly } }}
    />
    <TextField
      label="NIF/CIF"
      fullWidth
      value={values.legalId}
      onChange={(e) => onChange("legalId", e.target.value)}
      inputRef={inputRefs.legalId}
      error={!!fieldErrors.legalId}
      helperText={fieldErrors.legalId}
      slotProps={{ htmlInput: { readOnly } }}
    />
    <TextField
      label="Dirección"
      fullWidth
      value={values.address}
      onChange={(e) => onChange("address", e.target.value)}
      inputRef={inputRefs.address}
      slotProps={{ htmlInput: { readOnly } }}
    />
  </>
);
