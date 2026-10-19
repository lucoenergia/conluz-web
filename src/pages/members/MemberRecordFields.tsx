import type { ChangeEvent, FC } from "react";
import { TextField } from "@mui/material";
import type { MemberRecordErrors, MemberRecordField, MemberRecordValues } from "./memberRecordForm";

interface MemberRecordFieldsProps {
  values: MemberRecordValues;
  errors: MemberRecordErrors;
  onChange: (field: MemberRecordField, value: string) => void;
}

/**
 * The record a community keeps on a member: the fields the record edit and the
 * registration share (#272, #275). The personal ID is each dialog's own, since
 * one shows it read-only and the other asks for it.
 */
export const MemberRecordFields: FC<MemberRecordFieldsProps> = ({ values, errors, onChange }) => {
  const fieldProps = (field: keyof MemberRecordValues) => ({
    value: values[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(field, event.target.value),
    error: !!errors[field],
    helperText: errors[field] ?? "",
    fullWidth: true,
  });

  return (
    <>
      <TextField label="Nombre completo" required {...fieldProps("fullName")} />
      <TextField
        label="Número de socio"
        slotProps={{ htmlInput: { inputMode: "numeric" } }}
        {...fieldProps("memberNumber")}
      />
      <TextField label="Email de contacto" type="email" {...fieldProps("contactEmail")} />
      <TextField label="Dirección" {...fieldProps("address")} />
      <TextField label="Teléfono" {...fieldProps("phoneNumber")} />
    </>
  );
};
