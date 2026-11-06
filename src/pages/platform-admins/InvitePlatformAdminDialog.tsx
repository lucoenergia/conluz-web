import { useRef, useState, type FC, type FormEvent } from "react";
import { Alert, Button, TextField } from "@mui/material";
import type { InvitePlatformAdminBody } from "../../api/models";
import type { Action, PlatformInvitationSentResult } from "../../hooks/actions";
import {
  EMPTY_ADMIN_INVITATION,
  type AdminInvitationValues,
  type MemberRecordErrors,
  type MemberRecordField,
} from "../members/memberRecordForm";
import { MemberRecordFields } from "../members/MemberRecordFields";
import { ConfirmationCodePanel } from "./ConfirmationCodePanel";
import { CONFIRMATION_CODE_CLOSE_QUESTION, CONFIRMATION_CODE_TITLE } from "./confirmationCodeQuestion";
import {
  PLATFORM_ADMIN_EMAIL_LABEL,
  platformAdminInvitationBodyOf,
  platformAdminInvitationRefusalOf,
  validatePlatformAdminInvitation,
} from "./platformAdminInvitationForm";
import { Notice } from "../../components/Notice";
import { AppModal } from "../../components/Modals/AppModal";
import { ModalCancelButton } from "../../components/Modals/ModalCancelButton";

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
 * what was typed. On success the same overlay shows the code, kept in its
 * state and discarded when it closes. While the code shows, "Hecho" closes it
 * and any other close attempt asks first (UI-PAD-010).
 */
export const InvitePlatformAdminDialog: FC<InvitePlatformAdminDialogProps> = ({ inviteAdmin, onCodeShown, onClose }) => {
  const [values, setValues] = useState<AdminInvitationValues>(EMPTY_ADMIN_INVITATION);
  const [errors, setErrors] = useState<MemberRecordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const inFlight = inviteAdmin?.isPending ?? false;
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const dirty = (Object.keys(EMPTY_ADMIN_INVITATION) as (keyof AdminInvitationValues)[]).some(
    (field) => values[field] !== EMPTY_ADMIN_INVITATION[field],
  );

  const change = (field: MemberRecordField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    if (!inviteAdmin) return;
    const invalid = validatePlatformAdminInvitation(values);
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

  // One overlay for the form and the code: the code replaces the form in place,
  // never opening a second dialog after the request resolves.
  if (code !== null) {
    return (
      <AppModal
        isOpen
        onClose={onClose}
        title={CONFIRMATION_CODE_TITLE}
        dirty
        {...CONFIRMATION_CODE_CLOSE_QUESTION}
        discardReturnFocus={copyButtonRef}
        actions={
          <Button variant="contained" onClick={onClose}>
            Hecho
          </Button>
        }
      >
        <ConfirmationCodePanel code={code} fullName={values.fullName.trim()} copyButtonRef={copyButtonRef} />
      </AppModal>
    );
  }

  return (
    <AppModal
      isOpen
      onClose={onClose}
      dismissible={!inFlight}
      dirty={dirty}
      title="Invitar administrador de plataforma"
      onSubmit={handleSubmit}
      actions={
        <>
          <ModalCancelButton disabled={inFlight} />
          <Button type="submit" variant="contained" disabled={!inviteAdmin || inviteAdmin.isPending}>
            {inviteAdmin?.isPending ? "Enviando..." : "Invitar"}
          </Button>
        </>
      }
    >
      {formError && <Alert severity="error">{formError}</Alert>}
      <Notice severity="info">
        Le llegará un email con un enlace para aceptar. Después verás un código de confirmación que tendrás que
        darle tú: sin él no podrá aceptar. Será administrador de la plataforma solo cuando acepte.
      </Notice>
      <TextField
        label="DNI/NIE/NIF"
        required
        value={values.personalId}
        onChange={(event) => change("personalId", event.target.value)}
        error={!!errors.personalId}
        helperText={errors.personalId ?? ""}
        fullWidth
        slotProps={{ htmlInput: { readOnly: inFlight } }}
      />
      <MemberRecordFields
        values={values}
        errors={errors}
        onChange={change}
        fields={FIELDS}
        required={FIELDS}
        labels={{ contactEmail: PLATFORM_ADMIN_EMAIL_LABEL }}
        readOnly={inFlight}
      />
    </AppModal>
  );
};
