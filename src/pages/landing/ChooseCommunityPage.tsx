import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { CommunitySwitch } from "../../components/ScopeContext";
import { useActiveCommunityDetails } from "../../hooks/useActiveCommunityDetails";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";

/**
 * What a caller with several communities and none selected sees at "/" (#221):
 * a prompt to pick one, with the same control the scope surface offers, and
 * the same line beneath it saying what choosing does.
 * Choosing remounts the routed page on the new community, and the landing
 * takes them to the home from there.
 */
export const ChooseCommunityPage: FC = () => {
  const details = useActiveCommunityDetails();

  return (
    <Box sx={{ ...sxStyles.pageContainer, p: { xs: 3, sm: 4 }, maxWidth: 640 }}>
      <Typography variant="h4" component="h1" sx={{ color: colors.text.primary, mb: 3 }}>
        Elige una comunidad
      </Typography>
      <CommunitySwitch details={details} buttonLabel="Elegir comunidad" />
    </Box>
  );
};
