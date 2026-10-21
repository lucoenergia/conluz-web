import { useState, type FC } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import type { MaybeAction, PlatformAdminWriteResult, PlatformInvitationSentResult } from "../../hooks/actions";
import { ConfirmationCodePanel } from "./ConfirmationCodePanel";

export type PlatformInvitationWriteKind = "resend" | "revoke";

const COPY: Record<
  PlatformInvitationWriteKind,
  { title: string; question: string; consequence: string; confirm: string; pending: string }
> = {
  resend: {
    title: "Reenviar invitación",
    question: "¿Reenviar la invitación de administrador de plataforma a ",
    consequence:
      "Le llegará un enlace nuevo por email y verás un código de confirmación nuevo. El enlace y el código anteriores dejarán de funcionar.",
    confirm: "Reenviar",
    pending: "Enviando...",
  },
  revoke: {
    title: "Revocar enlace",
    question: "¿Revocar el enlace de invitación de ",
    consequence:
      "El enlace que le enviaste dejará de funcionar. Seguirá pendiente, y podrás reenviarle la invitación cuando quieras.",
    confirm: "Revocar enlace",
    pending: "Revocando...",
  },
};

interface PlatformInvitationActionDialogProps {
  kind: PlatformInvitationWriteKind;
  fullName: string;
  /**
   * The row's action in its current state. The page keeps the dialog mounted
   * only while the row grants it -- or while it shows a code, which must
   * outlive a refetch that changes the row.
   */
  action: MaybeAction<[], PlatformInvitationSentResult | PlatformAdminWriteResult>;
  /** Tells the page a code is on screen, so it keeps the dialog mounted until "Hecho". */
  onCodeShown: () => void;
  onClose: () => void;
  /** Called with the refusal, after the dialog has closed. */
  onRefused: (error: unknown) => void;
}

/**
 * The confirmation for resending a pending platform-admin invitation, and for
 * revoking its link (#288). Both email the person or stop a link from working,
 * so neither is sent on a single click of the menu item.
 *
 * A resend that succeeds shows its new confirmation code in place, kept in
 * this dialog's state and discarded with it.
 */
export const PlatformInvitationActionDialog: FC<PlatformInvitationActionDialogProps> = ({
  kind,
  fullName,
  action,
  onCodeShown,
  onClose,
  onRefused,
}) => {
  const [code, setCode] = useState<string | null>(null);
  const copy = COPY[kind];

  const handleConfirm = async () => {
    if (!action) return;
    const result = await action.run();
    if ("confirmationCode" in result) {
      setCode(result.confirmationCode);
      onCodeShown();
      return;
    }
    onClose();
    if ("error" in result) onRefused(result.error);
  };

  if (code !== null) {
    return (
      // No onClose while the code shows: neither a backdrop click nor Escape
      // closes it, only "Hecho".
      <Dialog open maxWidth="xs" fullWidth>
        <ConfirmationCodePanel code={code} fullName={fullName} onDone={onClose} />
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{copy.title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="body2">
          {copy.question}
          <strong>{fullName}</strong>?
        </Typography>
        <Alert severity="info">{copy.consequence}</Alert>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          color={kind === "revoke" ? "error" : "primary"}
          onClick={handleConfirm}
          disabled={!action || action.isPending}
        >
          {action?.isPending ? copy.pending : copy.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
