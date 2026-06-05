import type { FC } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Link } from "react-router";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";

export const PlatformPage: FC = () => {
  return (
    <Box sx={{ ...sxStyles.pageContainer, p: { xs: 3, sm: 4 }, maxWidth: 640 }}>
      <Typography variant="h4" gutterBottom sx={{ color: colors.text.primary }}>
        Administración de plataforma
      </Typography>
      <Typography sx={{ color: colors.text.subtle, mb: 4 }}>
        Administra las comunidades energéticas de la plataforma.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button variant="contained" component={Link} to="/communities/new">
          Crear comunidad
        </Button>
        <Button variant="outlined" component={Link} to="/users">
          Gestionar usuarios
        </Button>
      </Stack>
    </Box>
  );
};
