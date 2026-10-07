import { AppBar, Button, Toolbar } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import type { FC } from "react";
import { colors } from "../../theme/tokens";
import { useLogout } from "../../hooks/useLogout";
import { Logo } from "./Logo";

/**
 * The app bar shown while the caller must change their password (#213): the
 * logo and a way out, nothing else.
 *
 * The regular header carries the menu toggle and the profile menu, and the
 * layout that hosts it reads the active community's capabilities and list --
 * requests the backend refuses until the password has been changed. This bar
 * reads nothing, so it can stay on screen for as long as the change takes.
 */
export const PasswordChangeHeader: FC = () => {
  const logout = useLogout();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: colors.background.paper,
        borderBottom: `1px solid ${colors.divider}`,
      }}
    >
      <Toolbar
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo />
        <Button
          onClick={() => void logout()}
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          sx={{ fontWeight: 500, flexShrink: 0 }}
        >
          Salir
        </Button>
      </Toolbar>
    </AppBar>
  );
};
