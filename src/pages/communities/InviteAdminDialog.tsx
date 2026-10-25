import { useState, type FC, type FormEvent } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
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

  const change = (field: MemberRecordField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
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
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ px: 3, pt: 2.5 }}>
          <CommunityScopeHeader name={communityName} />
        </Box>
        <DialogTitle sx={{ pt: 0 }}>Invitar administrador a {community}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
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
            sx={{ mt: 1 }}
          />
          <MemberRecordFields
            values={values}
            errors={errors}
            onChange={change}
            fields={ADMIN_FIELDS}
            required={ADMIN_REQUIRED}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={inviteAdmin.isPending}>
            {inviteAdmin.isPending ? "Enviando..." : "Invitar"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
