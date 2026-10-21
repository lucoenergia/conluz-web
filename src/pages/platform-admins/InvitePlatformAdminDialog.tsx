import { useState, type FC, type FormEvent } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import type { InvitePlatformAdminBody } from "../../api/models";
import type { Action, PlatformInvitationSentResult } from "../../hooks/actions";
import {
  EMPTY_ADMIN_INVITATION,
  validateAdminInvitation,
  type AdminInvitationValues,
  type MemberRecordErrors,
  type MemberRecordField,
} from "../members/memberRecordForm";
import { MemberRecordFields } from "../members/MemberRecordFields";
import { ConfirmationCodePanel } from "./ConfirmationCodePanel";
import { platformAdminInvitationBodyOf, platformAdminInvitationRefusalOf } from "./platformAdminInvitationForm";

const FIELDS = ["fullName", "contactEmail"] as const;

interface InvitePlatformAdminDialogProps {
  /**
   * The action, while the caller may invite. The page keeps the dialog
   * mounted while it shows a code even if the action goes away.
   */
  inviteAdmin: Action<[InvitePlatformAdminBody], PlatformInvitationSentResult> | undefined;
  /** Tells the page a code is on screen, so it keeps the dialog mounted until "Hecho". */
  onCodeShown: () => void;
  onClose: () => void;
}

/**
 * Invites a person to the platform-admin role (#288), with the community
 * admin invitation's form pieces (#276): DNI/NIE/NIF, full name and email, all
 * three required. The person is emailed a link; the role is granted only when
 * they accept it with the confirmation code this dialog then shows, once.
 *
 * Mounted on open, so every opening starts from an empty form. A refusal keeps
 * what was typed. On success the same dialog shows the code, kept in its state
 * and discarded when it closes; while it shows, only "Hecho" closes it.
 */
export const InvitePlatformAdminDialog: FC<InvitePlatformAdminDialogProps> = ({ inviteAdmin, onCodeShown, onClose }) => {
  const [values, setValues] = useState<AdminInvitationValues>(EMPTY_ADMIN_INVITATION);
  const [errors, setErrors] = useState<MemberRecordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const change = (field: MemberRecordField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!inviteAdmin) return;
    const invalid = validateAdminInvitation(values);
    setErrors(invalid);
    setFormError(null);
    if (Object.keys(invalid).length > 0) return;

    const result = await inviteAdmin.run(platformAdminInvitationBodyOf(values));
    if ("ok" in result) {
      setCode(result.confirmationCode);
      onCodeShown();
      return;
    }
    const refusal = platformAdminInvitationRefusalOf(result.error);
    if ("field" in refusal) {
      setErrors({ [refusal.field]: refusal.message });
    } else {
      setFormError(refusal.form);
    }
  };

  if (code !== null) {
    return (
      // No onClose while the code shows: neither a backdrop click nor Escape
      // closes it, only "Hecho".
      <Dialog open maxWidth="sm" fullWidth>
        <ConfirmationCodePanel code={code} fullName={values.fullName.trim()} onDone={onClose} />
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle>Invitar administrador de plataforma</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <Alert severity="info">
            Le llegará un email con un enlace para aceptar. Después verás un código de confirmación que tendrás que
            darle tú: sin él no podrá aceptar. Será administrador de la plataforma solo cuando acepte.
          </Alert>
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
          <MemberRecordFields values={values} errors={errors} onChange={change} fields={FIELDS} required={FIELDS} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={!inviteAdmin || inviteAdmin.isPending}>
            {inviteAdmin?.isPending ? "Enviando..." : "Invitar"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
