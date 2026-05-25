import { AppBar, IconButton, Toolbar, Box } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import MenuIcon from "@mui/icons-material/Menu";
import { Logo } from "./Logo";
import type { FC } from "react";
import { ProfileMenu } from "../Menu/ProfileMenu";

interface HeaderProps {
  username?: string;
  onMenuClick: Function;
}

export const Header: FC<HeaderProps> = ({ onMenuClick, username = "" }) => {
  // zIndex is required to make SideMenu render under AppBar
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: colors.background.paper,
        borderBottom: '1px solid #e5e7eb',
        // eslint-disable-next-line no-restricted-syntax -- app-bar divider shadow; no matching token (0.05 opacity, very subtle)
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      <Toolbar
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={sxStyles.flexRowCenter}>
          <IconButton
            size="large"
            edge="start"
            aria-label="menu"
            onClick={() => onMenuClick()}
            sx={{
              color: colors.text.subtle,
              '&:hover': {
                // eslint-disable-next-line no-restricted-syntax -- icon-button hover tint; Tailwind gray-100, no matching token
                backgroundColor: '#f3f4f6',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
          <Logo responsive />
        </Box>

        <Box sx={sxStyles.flexRowCenter}>
          <ProfileMenu username={username} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
