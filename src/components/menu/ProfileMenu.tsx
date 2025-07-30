import { Avatar, Divider, IconButton, Menu, MenuItem } from "@mui/material";
import { useState, type FC } from "react";
import { MenuLinkItem } from "../menu/MenuLinkItem";
import { LabeledIcon } from "../labeled-icon/LabeledIcon";
import PersonIcon from '@mui/icons-material/Person';
import KeyIcon from '@mui/icons-material/Key';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthDispatch } from "../../api/auth.context";
import { useNavigate } from "react-router";

interface ProfileMenuProps {
  username: string
}

export const ProfileMenu: FC<ProfileMenuProps> = ({ username }) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const dispatchAuth = useAuthDispatch();
  const navigate = useNavigate();

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElement(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElement(null);
  };
  

  const logout = () => {
    dispatchAuth(null);
    navigate('/login');
  }
  
  return <>
    <IconButton sx={{ p: 0 }} onClick={handleOpenUserMenu}>
      <Avatar alt="Icono de usuario" />
    </IconButton>
    <Menu
      sx={{ mt: '45px' }}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      anchorEl={anchorElement}
      open={Boolean(anchorElement)}
      onClose={handleCloseUserMenu}
    >
      <MenuItem>{ username }</MenuItem>
      <Divider />
      <MenuLinkItem to="/profile">
        <LabeledIcon
          variant="compact"
          justify="between"
          iconPosition="right"
          icon={PersonIcon}
          label="Mi perfil"
        />
      </MenuLinkItem>
      <MenuItem>
        <LabeledIcon
          variant="compact"
          justify="between"
          iconPosition="right"
          icon={KeyIcon}
          label="Cambiar contraseña"
        />
      </MenuItem>
      <Divider />
      <MenuLinkItem to="/contact">
        <LabeledIcon
          variant="compact"
          justify="between"
          iconPosition="right"
          icon={HelpOutlineIcon}
          label="¿Necesitas ayuda?"
        />
      </MenuLinkItem>
      <Divider />
      <MenuItem onClick={logout}>
        <LabeledIcon
          variant="compact"
          justify="between"
          iconPosition="right"
          icon={LogoutIcon}
          label="Salir"
        />
      </MenuItem>
    </Menu>
  </>
}
