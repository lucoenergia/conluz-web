import { Avatar, Box, Link, Paper, Typography } from "@mui/material";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import HomeIcon from "@mui/icons-material/Home";
import { radii, shadows, alphas, fontSizes } from "../../theme/tokens";

/**
 * What any path that matches no route renders (#234).
 *
 * Public, with or without a session, and it reads nothing: it is not a failure
 * of the app, so it carries no alert colouring either. The link goes to "/"
 * and leaves the destination to it -- the landing for a signed-in caller, the
 * login page for everyone else.
 */
export const NotFoundPage: FC = () => {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 2, sm: 3 } }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: "100%",
          borderRadius: radii.large,
          boxShadow: shadows.auth, // same card as the other public pages
          overflow: "hidden",
        }}
      >
        <Box
          sx={(theme) => ({
            background: theme.palette.primary.main,
            color: "white",
            p: { xs: 3, sm: 4 },
            textAlign: "center",
          })}
        >
          <Avatar sx={{ bgcolor: alphas.white.soft, width: 64, height: 64, margin: "0 auto 16px" }}>
            <SearchOffIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
            Esta página no existe
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.95 }}>
            Puede que el enlace sea antiguo o que la dirección esté mal escrita.
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 3, sm: 4 }, textAlign: "center" }}>
          <Link
            component={RouterLink}
            to="/"
            underline="none"
            sx={{
              fontSize: fontSizes.md,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              color: "primary.main",
              "&:hover": { color: "primary.dark" },
            }}
          >
            <HomeIcon sx={{ fontSize: 18 }} />
            Ir al inicio
          </Link>
        </Box>
      </Paper>
    </Box>
  );
};
