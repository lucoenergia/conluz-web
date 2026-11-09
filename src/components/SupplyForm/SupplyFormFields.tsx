import type { FC, Ref } from "react";
import { TextField, Autocomplete, CircularProgress } from "@mui/material";
import { selectedOwnerOf, type SupplyFieldValues, type SupplyFormField, type SupplyOwnerField } from "./supplyFields";

interface SupplyFormFieldsProps {
  values: SupplyFieldValues;
  onChange: <K extends keyof SupplyFieldValues>(field: K, value: SupplyFieldValues[K]) => void;
  /** A refusal shown on the input it is about, until that input is edited. */
  fieldErrors?: Partial<Record<SupplyFormField, string>>;
  /** Called when an input with an error is edited, so the screen can clear it. */
  onFieldEdit?: (field: SupplyFormField) => void;
  owner?: SupplyOwnerField;
  /** While a save is in flight, nothing can be changed. */
  readOnly?: boolean;
  cupsInputRef?: Ref<HTMLInputElement>;
  ownerInputRef?: Ref<HTMLInputElement>;
}

/** The supply's inputs, controlled by the screen that holds them. */
export const SupplyFormFields: FC<SupplyFormFieldsProps> = ({
  values,
  onChange,
  fieldErrors = {},
  onFieldEdit,
  owner,
  readOnly = false,
  cupsInputRef,
  ownerInputRef,
}) => {
  const ownerOptions = owner?.mode === "choose" ? owner.options : [];
  const selectedOwner = selectedOwnerOf(owner, values.ownerId);
  const ownerLoading = owner?.mode === "choose" && owner.status === "loading";
  const ownerNotice =
    owner?.mode !== "choose"
      ? undefined
      : owner.status === "error"
        ? "No se pudieron cargar los miembros de esta comunidad. Inténtalo más tarde."
        : owner.status === "ready" && owner.options.length === 0
          ? "Esta comunidad todavía no tiene miembros. Añádelos antes de crear un punto de suministro."
          : undefined;

  return (
    <>
      <TextField
        id="name"
        label="Nombre"
        type="text"
        name="name"
        value={values.name}
        onChange={(e) => onChange("name", e.target.value)}
        slotProps={{ htmlInput: { maxLength: 50, readOnly } }}
        autoFocus
        fullWidth
        variant="outlined"
      />

      {owner?.mode === "choose" && (
        <Autocomplete
          options={ownerOptions}
          getOptionLabel={(option) => `${option.fullName} (${option.personalId})`}
          // Two members may share a label; the membership is what identifies them.
          getOptionKey={(option) => option.id}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={selectedOwner}
          onChange={(_, newValue) => {
            onChange("ownerId", newValue?.id ?? null);
            onFieldEdit?.("personalId");
          }}
          loading={ownerLoading}
          readOnly={readOnly}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Propietario"
              required
              variant="outlined"
              inputRef={ownerInputRef}
              error={!!fieldErrors.personalId || owner.status === "error"}
              helperText={fieldErrors.personalId ?? ownerNotice}
              slotProps={{
                input: {
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {ownerLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
        />
      )}

      {owner?.mode === "show" && (
        // The owner of an existing supply cannot be changed here; it is the
        // supply's member record in its community (UI-SUP-005).
        <TextField
          id="owner"
          label="Propietario"
          type="text"
          value={owner.fullName || "-"}
          slotProps={{ htmlInput: { readOnly: true } }}
          fullWidth
          variant="outlined"
        />
      )}

      <TextField
        id="cups"
        label="CUPS"
        type="text"
        name="cups"
        value={values.cups}
        onChange={(e) => {
          onChange("cups", e.target.value);
          onFieldEdit?.("cups");
        }}
        inputRef={cupsInputRef}
        slotProps={{ htmlInput: { maxLength: 50, readOnly } }}
        error={!!fieldErrors.cups}
        helperText={fieldErrors.cups}
        required
        fullWidth
        variant="outlined"
      />

      <TextField
        id="address"
        label="Dirección"
        type="text"
        name="address"
        value={values.address}
        onChange={(e) => onChange("address", e.target.value)}
        slotProps={{ htmlInput: { maxLength: 50, readOnly } }}
        required
        fullWidth
        variant="outlined"
      />

      <TextField
        id="addressRef"
        label="Referencia catastral"
        type="text"
        name="addressRef"
        value={values.addressRef}
        onChange={(e) => onChange("addressRef", e.target.value)}
        slotProps={{ htmlInput: { maxLength: 50, readOnly } }}
        fullWidth
        variant="outlined"
      />
    </>
  );
};
