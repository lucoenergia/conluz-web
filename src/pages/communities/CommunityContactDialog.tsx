import type { FC } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useGetCommunityContact } from "../../api/communities/communities";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { ContactChannelList } from "../../components/ContactChannelList";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { AppModal } from "../../components/Modals/AppModal";
import { colors } from "../../theme/tokens";
import { isNotFoundError } from "./communityForm";
import { CommunityNotFound } from "./CommunityNotFound";

interface CommunityContactDialogProps {
  /** The community whose contact is shown, as the list row holds it. */
  community: { id: string; name: string };
  onClose: () => void;
}

/**
 * A community's contact channels, read-only, opened from its row on the
 * communities list (#295, moved out of community editing in #374). The
 * platform admin routes callers who cannot sign in to their community, and
 * needs to see where to send them, for any community.
 *
 * There is no edit action, and no member fallback: with no channels it says so,
 * because the operator contact is the platform admin's own. Nothing here is
 * written, so the overlay is never dirty and never in flight.
 */
export const CommunityContactDialog: FC<CommunityContactDialogProps> = ({ community, onClose }) => {
  const { data, isPending, error, refetch } = useGetCommunityContact(community.id);

  let content;
  if (isPending) {
    content = (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <CircularProgress aria-label="Cargando el contacto de la comunidad" />
      </Box>
    );
  } else if (isNotFoundError(error)) {
    content = <CommunityNotFound />;
  } else if (error) {
    content = (
      <LoadErrorAlert message="No se pudo cargar el contacto de la comunidad." onRetry={() => void refetch()} />
    );
  } else if (data.channels.length === 0) {
    content = (
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        Esta comunidad aún no ha configurado su contacto.
      </Typography>
    );
  } else {
    content = <ContactChannelList channels={data.channels} />;
  }

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Contacto"
      scopeHeader={<CommunityScopeHeader name={community.name} />}
    >
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        Cómo pueden contactar sus miembros con quien gestiona la comunidad.
      </Typography>
      {content}
    </AppModal>
  );
};
