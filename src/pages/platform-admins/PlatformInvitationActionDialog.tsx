import { useRef, useState, type FC } from "react";
import { Button, Typography } from "@mui/material";
import type { MaybeAction, PlatformAdminWriteResult, PlatformInvitationSentResult } from "../../hooks/actions";
import { ConfirmationCodePanel } from "./ConfirmationCodePanel";
import { CONFIRMATION_CODE_CLOSE_QUESTION, CONFIRMATION_CODE_TITLE } from "./confirmationCodeQuestion";
import { Notice } from "../../components/Notice";
import { AppModal } from "../../components/Modals/AppModal";
import { ConfirmationActions } from "../../components/Modals/ConfirmationActions";

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
 * A resend that succeeds shows its new confirmation code in place, in the same
 * overlay at the same size, kept in this dialog's state and discarded with it.
 * While the code shows, "Hecho" closes it and any other close attempt asks
 * first (UI-PAD-010).
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
  const inFlight = action?.isPending ?? false;
  const copyButtonRef = useRef<HTMLButtonElement>(null);

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
      <AppModal
        isOpen
        onClose={onClose}
        size="compact"
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
        <ConfirmationCodePanel code={code} fullName={fullName} copyButtonRef={copyButtonRef} />
      </AppModal>
    );
  }

  return (
    <AppModal
      isOpen
      onClose={onClose}
      size="compact"
      dismissible={!inFlight}
      title={copy.title}
      actions={
        <ConfirmationActions
          onConfirm={handleConfirm}
          confirmLabel={inFlight ? copy.pending : copy.confirm}
          confirmColor={kind === "revoke" ? "error" : "primary"}
          confirmDisabled={!action || action.isPending}
          inFlight={inFlight}
        />
      }
    >
      <Typography variant="body2">
        {copy.question}
        <strong>{fullName}</strong>?
      </Typography>
      <Notice severity="info">{copy.consequence}</Notice>
    </AppModal>
  );
};
