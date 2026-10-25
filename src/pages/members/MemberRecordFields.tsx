import type { ChangeEvent } from "react";
import { TextField } from "@mui/material";
import type { MemberRecordErrors, MemberRecordField, MemberRecordValues } from "./memberRecordForm";

type RecordField = keyof MemberRecordValues;

const ALL_FIELDS: readonly RecordField[] = ["fullName", "memberNumber", "contactEmail", "address", "phoneNumber"];

interface MemberRecordFieldsProps<F extends RecordField> {
  values: Pick<MemberRecordValues, F>;
  errors: MemberRecordErrors;
  onChange: (field: MemberRecordField, value: string) => void;
  /** The fields this form asks for, always in the record's order. Every one by default. */
  fields?: readonly F[];
  /** The fields marked required. The full name by default, the only one the record requires. */
  required?: readonly F[];
  /** A label of this form's own for a field, where the record's would be wrong (#310). */
  labels?: Partial<Record<F, string>>;
}

/**
 * The record a community keeps on a member: the fields the record edit and the
 * registration share (#272, #275), and the part of it an admin invitation asks
 * for (#276). The personal ID is each dialog's own, since one shows it
 * read-only and the others ask for it.
 */
export function MemberRecordFields<F extends RecordField>({
  values,
  errors,
  onChange,
  fields,
  required,
  labels,
}: MemberRecordFieldsProps<F>) {
  const shownFields: readonly RecordField[] = fields ?? ALL_FIELDS;
  const requiredFields: readonly RecordField[] = required ?? ["fullName"];
  // Asked only of the fields `fields` lets through, so each one is in `values`.
  const recordValues: Partial<MemberRecordValues> = values;
  const fieldProps = (field: RecordField) => ({
    value: recordValues[field] ?? "",
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(field, event.target.value),
    error: !!errors[field],
    helperText: errors[field] ?? "",
    required: requiredFields.includes(field),
    fullWidth: true,
  });
  const shown = (field: RecordField) => shownFields.includes(field);
  const ownLabels: Partial<Record<RecordField, string>> = labels ?? {};

  return (
    <>
      {shown("fullName") && <TextField label="Nombre completo" {...fieldProps("fullName")} />}
      {shown("memberNumber") && (
        <TextField
          label="Número de socio"
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
          {...fieldProps("memberNumber")}
        />
      )}
      {shown("contactEmail") && <TextField label={ownLabels.contactEmail ?? "Email de contacto"} type="email" {...fieldProps("contactEmail")} />}
      {shown("address") && <TextField label="Dirección" {...fieldProps("address")} />}
      {shown("phoneNumber") && <TextField label="Teléfono" {...fieldProps("phoneNumber")} />}
    </>
  );
}
