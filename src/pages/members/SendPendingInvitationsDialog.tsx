import { useState, type FC } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import type { SendInvitationsResponse } from "../../api/models";
import type { Action, MembershipWriteResult } from "../../hooks/actions";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel } from "../../hooks/useActiveCommunityName";
import { invitationRefusalMessage } from "../../errors/membershipErrors";
import { pluralize } from "../../utils/pluralize";

interface SendPendingInvitationsDialogProps {
  communityName: string | undefined;
  /** The action itself: the dialog is mounted only when the community grants it. */
  sendPendingInvitations: Action<[], MembershipWriteResult<SendInvitationsResponse>>;
  onClose: () => void;
}

/**
 * Sends the first invitation to the members registered without one (#275).
 *
 * The backend picks who gets one and sends at most a batch per request, so the
 * dialog asks once, then shows each batch's result and offers the next while
 * some remain. It never counts the members itself: who qualifies is the
 * backend's rule, and the answer says how many remain.
 */
export const SendPendingInvitationsDialog: FC<SendPendingInvitationsDialogProps> = ({
  communityName,
  sendPendingInvitations,
  onClose,
}) => {
  const community = communityLabel(communityName);
  const [batch, setBatch] = useState<SendInvitationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    const result = await sendPendingInvitations.run();
    if ("ok" in result) setBatch(result.value);
    else setError(invitationRefusalMessage(result.error, "bulk"));
  };

  const { isPending } = sendPendingInvitations;
  const remaining = batch?.remaining ?? 0;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <Box sx={{ px: 3, pt: 2.5 }}>
        <CommunityScopeHeader name={communityName} />
      </Box>
      <DialogTitle sx={{ pt: 0 }}>Enviar invitaciones pendientes en {community}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {batch ? (
          <>
            <Typography variant="body2">
              {batch.sent === 0
                ? "No se ha enviado ninguna invitación."
                : `Se ${pluralize(batch.sent, "ha", "han")} enviado ${batch.sent} ${pluralize(batch.sent, "invitación", "invitaciones")}.`}
            </Typography>
            <Alert severity={remaining > 0 ? "info" : "success"}>
              {remaining > 0
                ? `${pluralize(remaining, "Queda", "Quedan")} ${remaining} por enviar. Puedes seguir con las siguientes.`
                : "No queda ninguna invitación pendiente de enviar."}
            </Alert>
          </>
        ) : (
          <>
            <Typography variant="body2">
              ¿Enviar la invitación a los miembros pendientes de {community} que tienen email de contacto y todavía no
              han recibido ninguna?
            </Typography>
            <Alert severity="info">
              Se envían por tandas de hasta 50. Los miembros suspendidos o sin email de contacto no la reciben.
            </Alert>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>{batch ? "Cerrar" : "Cancelar"}</Button>
        {(!batch || remaining > 0) && (
          <Button variant="contained" onClick={send} disabled={isPending}>
            {isPending ? "Enviando..." : batch ? "Enviar las siguientes" : "Enviar invitaciones"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
