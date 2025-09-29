import { AppBar, IconButton, Toolbar, Box } from "@mui/material";
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
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            size="large"
            edge="start"
            aria-label="menu"
            onClick={() => onMenuClick()}
            sx={{
              color: '#6b7280',
              '&:hover': {
                backgroundColor: '#f3f4f6',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
          <Logo responsive />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ProfileMenu username={username} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
