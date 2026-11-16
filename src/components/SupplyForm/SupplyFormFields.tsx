import type { FC, Ref } from "react";
import { TextField } from "@mui/material";
import { AddressField } from "../AddressField";
import { MemberPicker } from "../MemberPicker";
import { ReadOnlyField } from "../ReadOnlyField";
import type { SupplyFieldValues, SupplyFormField, SupplyOwnerField } from "./supplyFields";

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
  addressInputRef?: Ref<HTMLTextAreaElement>;
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
  addressInputRef,
}) => {
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
        <MemberPicker
          options={owner.options}
          status={owner.status}
          value={values.ownerId}
          onChange={(membership) => {
            onChange("ownerId", membership?.id ?? null);
            onFieldEdit?.("personalId");
          }}
          label="Propietario"
          required
          error={fieldErrors.personalId}
          emptyText="Esta comunidad todavía no tiene miembros. Añádelos antes de crear un punto de suministro."
          errorText="No se pudieron cargar los miembros de esta comunidad. Inténtalo más tarde."
          readOnly={readOnly}
          inputRef={ownerInputRef}
        />
      )}

      {owner?.mode === "show" && (
        // The owner of an existing supply cannot be changed here, and the form
        // says so; it is the supply's member record in its community
        // (UI-SUP-005, UI-SUP-023).
        <ReadOnlyField id="owner" label="Propietario" value={owner.fullName || "-"} helperText="El propietario no se puede cambiar" />
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

      <AddressField
        id="address"
        label="Dirección"
        name="address"
        value={values.address}
        onValueChange={(value) => {
          onChange("address", value);
          onFieldEdit?.("address");
        }}
        inputRef={addressInputRef}
        error={!!fieldErrors.address}
        helperText={fieldErrors.address}
        readOnly={readOnly}
        required
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
