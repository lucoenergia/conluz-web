import { useState, type FC, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import type { MemberResponse, RegisterMemberBody } from "../../api/models";
import type { Action, MembershipActions, MembershipWriteResult } from "../../hooks/actions";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel } from "../../hooks/useActiveCommunityName";
import { invitationRefusalMessage } from "../../errors/membershipErrors";
import {
  EMPTY_REGISTRATION,
  registrationBodyOf,
  registrationRefusalOf,
  validateRegistration,
  type MemberRecordErrors,
  type MemberRecordField,
  type RegistrationValues,
} from "./memberRecordForm";
import { MemberRecordFields } from "./MemberRecordFields";
import { Notice } from "../../components/Notice";
import { inFlightDialogProps } from "../../utils/inFlightDialog";

interface RegisterMemberDialogProps {
  communityName: string | undefined;
  /** The action itself: the dialog is mounted only when the community grants it. */
  register: Action<[RegisterMemberBody], MembershipWriteResult<MemberResponse>>;
  /** The per-row gate, asked of the registered member for "Invitar ahora". */
  forMembership: MembershipActions["forMembership"];
  onClose: () => void;
}

/**
 * Registers a member with the record the community keeps on them (#275). The
 * membership is created pending and nothing is sent; once it is, the admin may
 * invite the member straight away, when the record has somewhere to send it.
 *
 * Mounted on open, so every opening starts from an empty form.
 */
export const RegisterMemberDialog: FC<RegisterMemberDialogProps> = ({
  communityName,
  register,
  forMembership,
  onClose,
}) => {
  const community = communityLabel(communityName);
  const [values, setValues] = useState<RegistrationValues>(EMPTY_REGISTRATION);
  const [errors, setErrors] = useState<MemberRecordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<MemberResponse | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const change = (field: MemberRecordField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const invalid = validateRegistration(values);
    setErrors(invalid);
    setFormError(null);
    if (Object.keys(invalid).length > 0) return;

    const result = await register.run(registrationBodyOf(values));
    if ("ok" in result) {
      setRegistered(result.value);
      return;
    }
    const refusal = registrationRefusalOf(result.error);
    if ("field" in refusal) {
      setErrors({ [refusal.field]: refusal.message });
    } else {
      setFormError(refusal.form);
    }
  };

  if (registered) {
    // Offered only when there is an address to send it to and the backend lets
    // this caller invite this member. Without an email the backend would refuse.
    const invite = registered.contactEmail ? forMembership(registered).actions.invite : undefined;
    const handleInvite = async () => {
      if (!invite) return;
      setInviteError(null);
      const result = await invite.run();
      if ("ok" in result) onClose();
      else setInviteError(invitationRefusalMessage(result.error, "invite"));
    };
    const inviting = invite?.isPending ?? false;

    return (
      <Dialog open {...inFlightDialogProps(inviting, onClose)} maxWidth="sm" fullWidth>
        <Box sx={{ px: 3, pt: 2.5 }}>
          <CommunityScopeHeader name={communityName} />
        </Box>
        <DialogTitle sx={{ pt: 0 }}>Miembro registrado en {community}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {inviteError && <Alert severity="error">{inviteError}</Alert>}
          <Typography variant="body2">
            Has registrado a <strong>{registered.fullName}</strong> en {community}. Aparece como pendiente, y
            todavía no le hemos enviado nada.
          </Typography>
          {registered.contactEmail ? (
            invite && (
              <Notice severity="info">
                Si le invitas ahora, le llegará un email a {registered.contactEmail} con un enlace para unirse a{" "}
                {community}.
              </Notice>
            )
          ) : (
            <Notice severity="info">
              No tiene email de contacto, así que todavía no se le puede invitar. Añádelo desde «Editar ficha».
            </Notice>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={inviting}>
            Cerrar
          </Button>
          {invite && (
            <Button variant="contained" onClick={handleInvite} disabled={invite.isPending}>
              {invite.isPending ? "Enviando..." : "Invitar ahora"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open {...inFlightDialogProps(register.isPending, onClose)} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ px: 3, pt: 2.5 }}>
          <CommunityScopeHeader name={communityName} />
        </Box>
        <DialogTitle sx={{ pt: 0 }}>Registrar miembro en {community}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <Notice severity="info">
            Registrarle no le envía nada. Quedará pendiente hasta que le invites y acepte la invitación.
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
          <MemberRecordFields values={values} errors={errors} onChange={change} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={register.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={register.isPending}>
            {register.isPending ? "Registrando..." : "Registrar"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
