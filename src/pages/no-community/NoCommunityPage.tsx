import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import { Box, Link, Typography } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";

export const NoCommunityPage: FC = () => {
  return (
    <Box sx={{ ...sxStyles.pageContainer, p: { xs: 3, sm: 4 }, maxWidth: 640 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: colors.text.primary }}>
        Sin comunidad asignada
      </Typography>
      <Typography sx={{ color: colors.text.subtle }}>
        Tu cuenta no pertenece a ninguna comunidad energética. Contacta con un administrador para solicitar acceso.
      </Typography>
      <Link component={RouterLink} to="/community/contact" underline="hover" sx={{ display: "inline-block", mt: 2, fontWeight: 600 }}>
        Cómo pedir ayuda
      </Link>
    </Box>
  );
};
