import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { HomeViewSwitch } from "./HomeViewSwitch";
import type { HomeView } from "./useHomeViews";

/** Placeholder body of the management view until it gets its content (#198). */
export const HomeViewPlaceholder: FC<{ view: HomeView; title: string; description: string }> = ({
  view,
  title,
  description,
}) => (
  <Box sx={{ ...sxStyles.pageContainer, p: { xs: 3, sm: 4 }, maxWidth: 640 }}>
    <Typography variant="h4" component="h1" gutterBottom sx={{ color: colors.text.primary }}>
      {title}
    </Typography>
    <HomeViewSwitch current={view} />
    <Typography sx={{ color: colors.text.subtle }}>{description}</Typography>
  </Box>
);
