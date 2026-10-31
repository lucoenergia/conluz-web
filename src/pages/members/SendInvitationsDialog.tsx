import { useState, type FC } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import {
  SendInvitationResultResponseOutcome,
  type SendInvitationResultResponse,
  type SendInvitationsResponse,
} from "../../api/models";
import type { Action, MembershipWriteResult } from "../../hooks/actions";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel } from "../../hooks/useActiveCommunityName";
import { invitationResultReason, selectedInvitationsRefusalMessage } from "../../errors/membershipErrors";
import { pluralize } from "../../utils/pluralize";
import { Notice } from "../../components/Notice";
import { inFlightDialogProps } from "../../utils/inFlightDialog";
import { ActionStatus } from "../../components/ActionStatus";

/** Someone selected to receive an email: a first invitation, or a resend when already invited. */
export interface InvitationRecipient {
  userId: string;
  fullName: string;
  resend: boolean;
}

/** How many names each group lists before counting the rest. */
const NAMES_SHOWN = 5;

interface SendInvitationsDialogProps {
  communityName: string | undefined;
  /** The selection, as it stood when the dialog opened: first invitations, then resends. */
  recipients: InvitationRecipient[];
  /** The action itself: the dialog is mounted only when the community grants it. */
  sendInvitations: Action<[string[]], MembershipWriteResult<SendInvitationsResponse>>;
  /** Called once the backend has answered for each person, so the page can clear the selection. */
  onSent: () => void;
  onClose: () => void;
}

const RecipientGroup: FC<{ title: string; recipients: InvitationRecipient[] }> = ({ title, recipients }) => (
  <Box>
    <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600 }}>
      {title} ({recipients.length})
    </Typography>
    <Box component="ul" aria-label={title} sx={{ m: 0, pl: 2.5 }}>
      {recipients.slice(0, NAMES_SHOWN).map((recipient) => (
        <Typography key={recipient.userId} component="li" variant="body2">
          {recipient.fullName}
        </Typography>
      ))}
      {recipients.length > NAMES_SHOWN && (
        <Typography component="li" variant="body2" sx={{ color: "text.secondary" }}>
          y {recipients.length - NAMES_SHOWN} más
        </Typography>
      )}
    </Box>
  </Box>
);

/**
 * Sends a first invitation to each selected member never invited, and resends
 * it to each one already invited (#328). It names everyone who will receive an
 * email before sending, and afterwards says, per person, who was not sent one
 * and why: the backend decides each person and answers for each.
 */
export const SendInvitationsDialog: FC<SendInvitationsDialogProps> = ({
  communityName,
  recipients,
  sendInvitations,
  onSent,
  onClose,
}) => {
  const community = communityLabel(communityName);
  const [results, setResults] = useState<SendInvitationResultResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstInvitations = recipients.filter((recipient) => !recipient.resend);
  const resends = recipients.filter((recipient) => recipient.resend);
  const count = recipients.length;

  const send = async () => {
    setError(null);
    // The order shown: first invitations, then resends.
    const result = await sendInvitations.run(recipients.map((recipient) => recipient.userId));
    if ("ok" in result) {
      setResults(result.value.results);
      onSent();
    } else {
      setError(selectedInvitationsRefusalMessage(result.error));
    }
  };

  const { isPending } = sendInvitations;
  const sent = results?.filter((r) => r.outcome === SendInvitationResultResponseOutcome.SENT).length ?? 0;
  const resent = results?.filter((r) => r.outcome === SendInvitationResultResponseOutcome.RESENT).length ?? 0;
  const refused = results?.filter((r) => r.outcome === SendInvitationResultResponseOutcome.REFUSED) ?? [];
  const nameOf = (userId: string) =>
    recipients.find((recipient) => recipient.userId === userId)?.fullName ?? "Una persona de la selección";

  const sentText = `Primeras invitaciones enviadas: ${sent}.`;
  const resentText = `Invitaciones reenviadas: ${resent}.`;
  const refusedCount = `No se ha podido enviar a ${refused.length} ${pluralize(refused.length, "persona", "personas")}`;

  return (
    <Dialog open {...inFlightDialogProps(isPending, onClose)} maxWidth="sm" fullWidth>
      <Box sx={{ px: 3, pt: 2.5 }}>
        <CommunityScopeHeader name={communityName} />
      </Box>
      <DialogTitle sx={{ pt: 0 }}>Enviar invitación en {community}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {results ? (
          <>
            <Notice severity={refused.length > 0 ? "info" : "success"}>
              <Box component="span" sx={{ display: "block" }}>
                {sentText}
              </Box>
              <Box component="span" sx={{ display: "block" }}>
                {resentText}
              </Box>
            </Notice>
            {refused.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {refusedCount}:
                </Typography>
                <Box component="ul" aria-label="Personas a las que no se ha enviado" sx={{ m: 0, pl: 2.5 }}>
                  {refused.map((result) => (
                    <Typography key={result.user.id} component="li" variant="body2">
                      <strong>{nameOf(result.user.id)}</strong>: {invitationResultReason(result)}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </>
        ) : (
          <>
            <Typography variant="body2">
              {count === 1 ? "Recibirá un email esta persona:" : `Recibirán un email estas ${count} personas:`}
            </Typography>
            {firstInvitations.length > 0 && <RecipientGroup title="Primera invitación" recipients={firstInvitations} />}
            {resends.length > 0 && <RecipientGroup title="Reenvío" recipients={resends} />}
            {resends.length > 0 && (
              <Notice severity="info">
                A quien le reenvíes la invitación le llegará un enlace nuevo, y el anterior dejará de funcionar.
              </Notice>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isPending}>
          {results ? "Cerrar" : "Cancelar"}
        </Button>
        {!results && (
          <Button variant="contained" onClick={send} disabled={isPending}>
            {isPending ? "Enviando..." : `Enviar invitación (${count})`}
          </Button>
        )}
      </DialogActions>
      <ActionStatus message={results ? [sentText, resentText, refused.length > 0 ? `${refusedCount}.` : ""].filter(Boolean).join(" ") : ""} />
    </Dialog>
  );
};
