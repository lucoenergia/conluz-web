import type { FC } from "react";
import { Typography } from "@mui/material";
import { colors } from "../../theme/tokens";

/** The first thing anyone without a community contact is told (#295). */
export const ContactInstruction: FC = () => (
  <Typography variant="body1" sx={{ color: colors.text.body }}>
    Si necesitas ayuda, contacta con quien gestiona tu comunidad energética.
  </Typography>
);
