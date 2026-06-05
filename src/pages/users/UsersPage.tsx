import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";

export const UsersPage: FC = () => {
  return (
    <Box sx={{ ...sxStyles.pageContainer, p: { xs: 3, sm: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ color: colors.text.primary }}>
        Usuarios
      </Typography>
      <Typography sx={{ color: colors.text.subtle }}>
        Próximamente
      </Typography>
    </Box>
  );
};
