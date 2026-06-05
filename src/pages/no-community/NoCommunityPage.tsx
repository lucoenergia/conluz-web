import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";

export const NoCommunityPage: FC = () => {
  return (
    <Box sx={{ ...sxStyles.pageContainer, p: { xs: 3, sm: 4 }, maxWidth: 640 }}>
      <Typography variant="h4" gutterBottom sx={{ color: colors.text.primary }}>
        Sin comunidad asignada
      </Typography>
      <Typography sx={{ color: colors.text.subtle }}>
        Tu cuenta no pertenece a ninguna comunidad energética. Contacta con un administrador para solicitar acceso.
      </Typography>
    </Box>
  );
};
