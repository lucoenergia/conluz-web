import { useState, type FC, type FormEvent } from "react";
import { Alert, Button, TextField } from "@mui/material";
import type { CommunityAdminResponse, InviteCommunityAdminBody } from "../../api/models";
import type { Action, MembershipWriteResult } from "../../hooks/actions";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel } from "../../hooks/useActiveCommunityName";
import {
  adminInvitationBodyOf,
  adminInvitationRefusalOf,
  EMPTY_ADMIN_INVITATION,
  validateAdminInvitation,
  type AdminInvitationValues,
  type MemberRecordErrors,
  type MemberRecordField,
} from "../members/memberRecordForm";
import { MemberRecordFields } from "../members/MemberRecordFields";
import { Notice } from "../../components/Notice";
import { AppModal } from "../../components/Modals/AppModal";
import { ModalCancelButton } from "../../components/Modals/ModalCancelButton";

const ADMIN_FIELDS = ["fullName", "contactEmail", "phoneNumber"] as const;
const ADMIN_REQUIRED = ["fullName", "contactEmail"] as const;

interface InviteAdminDialogProps {
  communityName: string | undefined;
  /** The action itself: the dialog is mounted only when the community grants it. */
  inviteAdmin: Action<[InviteCommunityAdminBody], MembershipWriteResult<CommunityAdminResponse>>;
  onClose: () => void;
}

/**
 * Invites an admin to a community (#276): registers them with the record the
 * community keeps and emails them the link, in one step. The invitation goes to
 * the contact email, so this form requires it, unlike a member registration.
 *
 * Mounted on open, so every opening starts from an empty form. A refusal keeps
 * what was typed; on success the dialog closes and the list, refetched by the
 * action, shows the new admin pending with an active link.
 */
export const InviteAdminDialog: FC<InviteAdminDialogProps> = ({ communityName, inviteAdmin, onClose }) => {
  const community = communityLabel(communityName);
  const [values, setValues] = useState<AdminInvitationValues>(EMPTY_ADMIN_INVITATION);
  const [errors, setErrors] = useState<MemberRecordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const dirty = (Object.keys(EMPTY_ADMIN_INVITATION) as (keyof AdminInvitationValues)[]).some(
    (field) => values[field] !== EMPTY_ADMIN_INVITATION[field],
  );

  const change = (field: MemberRecordField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    const invalid = validateAdminInvitation(values);
    setErrors(invalid);
    setFormError(null);
    if (Object.keys(invalid).length > 0) return;

    const result = await inviteAdmin.run(adminInvitationBodyOf(values));
    if ("ok" in result) {
      onClose();
      return;
    }
    const refusal = adminInvitationRefusalOf(result.error);
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
      dismissible={!inviteAdmin.isPending}
      dirty={dirty}
      title={`Invitar administrador a ${community}`}
      scopeHeader={<CommunityScopeHeader name={communityName} />}
      onSubmit={handleSubmit}
      actions={
        <>
          <ModalCancelButton disabled={inviteAdmin.isPending} />
          <Button type="submit" variant="contained" disabled={inviteAdmin.isPending}>
            {inviteAdmin.isPending ? "Enviando..." : "Invitar"}
          </Button>
        </>
      }
    >
      {formError && <Alert severity="error">{formError}</Alert>}
      <Notice severity="info">
        Le llegará un email a su dirección de contacto con un enlace para aceptar. Quedará pendiente hasta que
        acepte la invitación.
      </Notice>
      <TextField
        label="DNI/NIE/NIF"
        required
        value={values.personalId}
        onChange={(event) => change("personalId", event.target.value)}
        error={!!errors.personalId}
        helperText={errors.personalId ?? ""}
        fullWidth
        slotProps={{ htmlInput: { readOnly: inviteAdmin.isPending } }}
      />
      <MemberRecordFields
        values={values}
        errors={errors}
        onChange={change}
        fields={ADMIN_FIELDS}
        required={ADMIN_REQUIRED}
        readOnly={inviteAdmin.isPending}
      />
    </AppModal>
  );
};
