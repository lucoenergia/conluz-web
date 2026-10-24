import type { FC } from "react";
import { Avatar, Box, CircularProgress, Paper, Typography } from "@mui/material";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import { useGetCommunityContact } from "../../api/communities/communities";
import { BreadCrumb } from "../../components/Breadcrumb";
import { ContactChannelList } from "../../components/ContactChannelList";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { useActiveCommunity, useIsActiveCommunityResolved } from "../../context/community.context";
import { useCommunityActions } from "../../hooks/actions";
import { useActiveCommunityCapabilities } from "../../hooks/permissions";
import { useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { sxStyles } from "../../theme/sx";
import { alphas, colors, radii } from "../../theme/tokens";
import { ContactInstruction } from "./ContactInstruction";
import { ManagedContactChannels } from "./ManagedContactChannels";
import { OperatorContact } from "./OperatorContact";
import { useOperatorContact } from "./useOperatorContact";

/**
 * The active community's contact channels (#295). With none to show -- the
 * community has not configured any, or the caller belongs to no community --
 * it tells them to contact whoever manages their community, and offers the
 * operator below that only when one is configured.
 *
 * Whoever may manage the community edits the channels here (#296), and with
 * none configured is asked to configure them rather than told to contact
 * somebody who is themselves.
 */
export const CommunityContactPage: FC = () => {
  const activeCommunityId = useActiveCommunity();
  const resolved = useIsActiveCommunityResolved();
  const communityName = useActiveCommunityName();

  const channelsQuery = useGetCommunityContact(activeCommunityId ?? "", {
    query: { enabled: !!activeCommunityId },
  });
  const channels = channelsQuery.data?.channels;

  // Both read GET /communities/{id}: the outcome tells "not yet known" and
  // "failed" from "no", the action is what saving runs.
  const manage = useActiveCommunityCapabilities("canManage");
  const { setContact } = useCommunityActions().forCommunity(useActiveCommunityResource()).actions;

  const noChannels = resolved && (activeCommunityId === null || channels?.length === 0);
  const inCommunity = activeCommunityId !== null;
  const managed = inCommunity && channelsQuery.isSuccess && !!setContact;
  // Neither the configure panel nor the fallback until it is known which one
  // applies. A failed check fails open to the fallback: it is still true, and
  // the page is still usable.
  const capabilityPending = noChannels && inCommunity && !managed && manage.state === "pending";
  const showFallback = noChannels && !managed && !capabilityPending;
  const operator = useOperatorContact(showFallback);

  let content;
  if (!resolved || (activeCommunityId !== null && channelsQuery.isPending) || capabilityPending) {
    content = (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress aria-label="Cargando el contacto" />
      </Box>
    );
  } else if (channelsQuery.isError) {
    content = (
      <LoadErrorAlert
        message="No se pudo cargar el contacto de tu comunidad."
        onRetry={() => void channelsQuery.refetch()}
      />
    );
  } else if (showFallback) {
    content = (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <ContactInstruction />
        {operator && <OperatorContact contact={operator} />}
      </Box>
    );
  } else {
    content = <ContactChannelList channels={channels ?? []} />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: colors.background.default,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box sx={sxStyles.pageContainerFull}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Contacto", href: "/community/contact" },
          ]}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 0, sm: radii.large },
          background: (theme) => theme.palette.primary.main,
          color: "white",
          boxSizing: "border-box",
        }}
      >
        <Box sx={sxStyles.flexRowCenter}>
          <Avatar sx={{ bgcolor: alphas.white.soft, width: 56, height: 56 }}>
            <SupportAgentRoundedIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1">Contacto</Typography>
            {activeCommunityId !== null && communityName && (
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {communityName}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      <Box sx={sxStyles.pageContainerFull}>
        {managed && activeCommunityId ? (
          <ManagedContactChannels
            communityId={activeCommunityId}
            communityName={communityName ?? undefined}
            channels={channels ?? []}
            setContact={setContact}
          />
        ) : (
          <Paper elevation={0} sx={sxStyles.softPanel}>
            {content}
          </Paper>
        )}
      </Box>
    </Box>
  );
};
