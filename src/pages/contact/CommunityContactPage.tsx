import type { FC } from "react";
import { Avatar, Box, CircularProgress, Paper, Typography } from "@mui/material";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import { useGetCommunityContact } from "../../api/communities/communities";
import { BreadCrumb } from "../../components/Breadcrumb";
import { ContactChannelList } from "../../components/ContactChannelList";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { useActiveCommunity, useIsActiveCommunityResolved } from "../../context/community.context";
import { useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import { sxStyles } from "../../theme/sx";
import { alphas, colors, radii } from "../../theme/tokens";
import { ContactInstruction } from "./ContactInstruction";
import { OperatorContact } from "./OperatorContact";
import { useOperatorContact } from "./useOperatorContact";

/**
 * The active community's contact channels (#295). With none to show -- the
 * community has not configured any, or the caller belongs to no community --
 * it tells them to contact whoever manages their community, and offers the
 * operator below that only when one is configured.
 */
export const CommunityContactPage: FC = () => {
  const activeCommunityId = useActiveCommunity();
  const resolved = useIsActiveCommunityResolved();
  const communityName = useActiveCommunityName();

  const channelsQuery = useGetCommunityContact(activeCommunityId ?? "", {
    query: { enabled: !!activeCommunityId },
  });
  const channels = channelsQuery.data?.channels;

  const showFallback = resolved && (activeCommunityId === null || channels?.length === 0);
  const operator = useOperatorContact(showFallback);

  let content;
  if (!resolved || (activeCommunityId !== null && channelsQuery.isPending)) {
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
        <Paper elevation={0} sx={sxStyles.softPanel}>
          {content}
        </Paper>
      </Box>
    </Box>
  );
};
