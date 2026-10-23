import type { FC } from "react";
import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import { useGetCommunityContact } from "../../api/communities/communities";
import { ContactChannelList } from "../../components/ContactChannelList";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { SectionHeading } from "../../components/SectionHeading";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";

/**
 * A community's contact channels, read-only, for the platform admin who opened
 * it from the communities list (#295). The operator routes callers who cannot
 * sign in to their community, and needs to see where to send them.
 *
 * There is no edit action, and no member fallback: with no channels it says so,
 * because the operator contact is the platform admin's own.
 */
export const CommunityContactSection: FC<{ communityId: string }> = ({ communityId }) => {
  const { data, isPending, isError, refetch } = useGetCommunityContact(communityId);

  let content;
  if (isPending) {
    content = (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <CircularProgress aria-label="Cargando el contacto de la comunidad" />
      </Box>
    );
  } else if (isError) {
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
    <Box sx={sxStyles.pageContainerFull}>
      <Paper component="section" aria-label="Contacto de la comunidad" elevation={0} sx={sxStyles.softPanel}>
        <SectionHeading
          title="Contacto"
          description="Cómo pueden contactar sus miembros con quien gestiona la comunidad."
        />
        {content}
      </Paper>
    </Box>
  );
};
