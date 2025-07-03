import { AppBar, Box, IconButton, Toolbar } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import { ProfileMenu } from "./ProfileMenu";
import { Logo } from "./Logo";
import type { FC } from "react";

interface HeaderProps {
  onMenuClick: Function
}

export const Header: FC<HeaderProps> = ({ onMenuClick }) => {

 
  return <Box >
    <AppBar>
      <Toolbar className="gap-2">
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={() => {onMenuClick()}}
        >
          <MenuIcon />
        </IconButton>
      <Logo/>
      <ProfileMenu username="Remy Sharp"/>
      </Toolbar>
    </AppBar>
  </Box>
}
