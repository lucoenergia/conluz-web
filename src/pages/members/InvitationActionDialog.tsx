import type { FC } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import type { Action, MembershipWriteResult } from "../../hooks/actions";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel } from "../../hooks/useActiveCommunityName";

export type InvitationWriteKind = "invite" | "resend" | "revoke";

const COPY: Record<
  InvitationWriteKind,
  { title: string; question: string; consequence: (community: string) => string; confirm: string; pending: string }
> = {
  invite: {
    title: "Enviar invitación en",
    question: "¿Enviar una invitación a ",
    consequence: (community) =>
      `Le llegará un email a su dirección de contacto con un enlace para unirse a ${community}.`,
    confirm: "Invitar",
    pending: "Enviando...",
  },
  resend: {
    title: "Reenviar invitación en",
    question: "¿Reenviar la invitación a ",
    consequence: () =>
      "Le llegará un enlace nuevo a su email de contacto, y el anterior dejará de funcionar.",
    confirm: "Reenviar",
    pending: "Enviando...",
  },
  revoke: {
    title: "Revocar enlace en",
    question: "¿Revocar el enlace de invitación de ",
    consequence: () =>
      "El enlace que le enviaste dejará de funcionar. Seguirá pendiente, y podrás reenviarle la invitación cuando quieras.",
    confirm: "Revocar enlace",
    pending: "Revocando...",
  },
};

interface InvitationActionDialogProps {
  kind: InvitationWriteKind;
  memberName: string;
  communityName: string | undefined;
  /**
   * The action itself: the dialog is mounted only while the row grants it in
   * its current state. A member's or a community admin's (#276): the dialog
   * reads only whether it was refused.
   */
  action: Action<[], MembershipWriteResult<unknown>>;
  onClose: () => void;
  /** Called with the refusal, after the dialog has closed. */
  onRefused: (error: unknown) => void;
}

/**
 * The confirmation for the three invitation writes on a roster row (#275),
 * and for the two on a community admin's row (#276).
 * Every one emails the member or stops a link from working, so none is sent on
 * a single click of the menu item.
 */
export const InvitationActionDialog: FC<InvitationActionDialogProps> = ({
  kind,
  memberName,
  communityName,
  action,
  onClose,
  onRefused,
}) => {
  const community = communityLabel(communityName);
  const copy = COPY[kind];

  const handleConfirm = async () => {
    const result = await action.run();
    onClose();
    if ("error" in result) onRefused(result.error);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <Box sx={{ px: 3, pt: 2.5 }}>
        <CommunityScopeHeader name={communityName} />
      </Box>
      <DialogTitle sx={{ pt: 0 }}>
        {copy.title} {community}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="body2">
          {copy.question}
          <strong>{memberName}</strong>?
        </Typography>
        <Alert severity="info">{copy.consequence(community)}</Alert>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          color={kind === "revoke" ? "error" : "primary"}
          onClick={handleConfirm}
          disabled={action.isPending}
        >
          {action.isPending ? copy.pending : copy.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
