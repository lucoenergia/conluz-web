import { AppBar, IconButton, Toolbar } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import { Logo } from "./Logo";
import type { FC } from "react";
import { ProfileMenu } from "../menu/ProfileMenu";

interface HeaderProps {
  onMenuClick: Function
}

export const Header: FC<HeaderProps> = ({ onMenuClick }) => {

  // zIndex is required to make SideMenu render under AppBar
  return <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
    <Toolbar className="gap-2">
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={() => { onMenuClick() }}
      >
        <MenuIcon />
      </IconButton>
      <Logo responsive />
      <ProfileMenu username="Remy Sharp" />
    </Toolbar>
  </AppBar>
}
