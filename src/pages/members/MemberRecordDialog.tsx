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
} from "@mui/material";
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
  const [values, setValues] = useState<MemberRecordValues>(() => recordValuesOf(membership));
  const [errors, setErrors] = useState<MemberRecordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const change = (field: MemberRecordField) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
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

  const fieldProps = (field: MemberRecordField) => ({
    value: values[field],
    onChange: change(field),
    error: !!errors[field],
    helperText: errors[field] ?? "",
    fullWidth: true,
  });

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ px: 3, pt: 2.5 }}>
          <CommunityScopeHeader name={communityName} />
        </Box>
        <DialogTitle sx={{ pt: 0 }}>Editar ficha en {community}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {hasPendingInvitation(membership) && (
            <Alert severity="info">
              Este miembro tiene una invitación pendiente. Si cambias el email de contacto, el próximo
              reenvío irá a la nueva dirección.
            </Alert>
          )}
          <TextField
            label="DNI/NIE"
            value={membership.user?.personalId ?? ""}
            helperText="Identifica su cuenta, así que no se cambia desde aquí."
            slotProps={{ input: { readOnly: true } }}
            fullWidth
            sx={{ mt: 1 }}
          />
          <TextField label="Nombre completo" required {...fieldProps("fullName")} />
          <TextField
            label="Número de socio"
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
            {...fieldProps("memberNumber")}
          />
          <TextField label="Email de contacto" type="email" {...fieldProps("contactEmail")} />
          <TextField label="Dirección" {...fieldProps("address")} />
          <TextField label="Teléfono" {...fieldProps("phoneNumber")} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={editRecord.isPending}>
            {editRecord.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
