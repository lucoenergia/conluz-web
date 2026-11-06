import { useState, type FC, type FormEvent } from "react";
import { Alert, Button, TextField } from "@mui/material";
import type { MembershipResponse, UpdateMemberRecordBody } from "../../api/models";
import type { Action, EditMemberRecordResult } from "../../hooks/actions";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel } from "../../hooks/useActiveCommunityName";
import {
  hasPendingInvitation,
  recordBodyOf,
  recordValuesOf,
  refusalOf,
  validateRecord,
  type MemberRecordErrors,
  type MemberRecordField,
  type MemberRecordValues,
} from "./memberRecordForm";
import { MemberRecordFields } from "./MemberRecordFields";
import { Notice } from "../../components/Notice";
import { AppModal } from "../../components/Modals/AppModal";
import { ModalCancelButton } from "../../components/Modals/ModalCancelButton";

interface MemberRecordDialogProps {
  membership: MembershipResponse;
  communityName: string | undefined;
  /** The action itself: the dialog is mounted only when the row grants it. */
  editRecord: Action<[UpdateMemberRecordBody], EditMemberRecordResult>;
  onClose: () => void;
}

/**
 * Edits the record a community keeps on one member (lucoenergia/conluz#416):
 * their name, number and contact details there, never their account, which
 * they share with their other communities.
 *
 * Mounted on open and seeded once from the row, so a refetch while it is open
 * does not overwrite what is being typed.
 */
export const MemberRecordDialog: FC<MemberRecordDialogProps> = ({
  membership,
  communityName,
  editRecord,
  onClose,
}) => {
  const community = communityLabel(communityName);
  const [seeded] = useState<MemberRecordValues>(() => recordValuesOf(membership));
  const [values, setValues] = useState<MemberRecordValues>(seeded);
  const [errors, setErrors] = useState<MemberRecordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const dirty = (Object.keys(seeded) as (keyof MemberRecordValues)[]).some((field) => values[field] !== seeded[field]);

  const change = (field: MemberRecordField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    const invalid = validateRecord(values);
    setErrors(invalid);
    setFormError(null);
    if (Object.keys(invalid).length > 0) return;

    const result = await editRecord.run(recordBodyOf(values));
    if ("ok" in result) {
      onClose();
      return;
    }
    const refusal = refusalOf(result.error);
    if ("field" in refusal) {
      setErrors({ [refusal.field]: refusal.message });
    } else {
      setFormError(refusal.form);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      dismissible={!editRecord.isPending}
      dirty={dirty}
      title={`Editar ficha en ${community}`}
      scopeHeader={<CommunityScopeHeader name={communityName} />}
      onSubmit={handleSubmit}
      actions={
        <>
          <ModalCancelButton disabled={editRecord.isPending} />
          <Button type="submit" variant="contained" disabled={editRecord.isPending}>
            {editRecord.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </>
      }
    >
      {formError && <Alert severity="error">{formError}</Alert>}
      {hasPendingInvitation(membership) && (
        <Notice severity="info">
          Este miembro tiene una invitación pendiente. Si cambias el email de contacto, el próximo
          reenvío irá a la nueva dirección.
        </Notice>
      )}
      <TextField
        label="DNI/NIE"
        value={membership.personalId}
        helperText="Identifica su cuenta, así que no se cambia desde aquí."
        slotProps={{ input: { readOnly: true } }}
        fullWidth
      />
      <MemberRecordFields values={values} errors={errors} onChange={change} readOnly={editRecord.isPending} />
    </AppModal>
  );
};
