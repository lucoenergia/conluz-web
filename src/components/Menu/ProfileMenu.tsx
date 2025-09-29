import { Avatar, Divider, IconButton, MenuItem, Box, Typography, Button } from "@mui/material";
import { useState, type FC } from "react";
import { Link } from "react-router";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import KeyIcon from "@mui/icons-material/Key";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import { MenuTemplate } from "./MenuTemplate";
import { useNavigate } from "react-router";
import { useAuthDispatch } from "../../context/auth.context";
import { useLoggedUserDispatch } from "../../context/logged-user.context";

interface ProfileMenuProps {
  username: string;
}

export const ProfileMenu: FC<ProfileMenuProps> = ({ username }) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const dispatchAuth = useAuthDispatch();
  const dispatchLoggedUser = useLoggedUserDispatch();
  const navigate = useNavigate();

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElement(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElement(null);
  };

  const logout = () => {
    dispatchAuth(null);
    dispatchLoggedUser(null);
    navigate("/login");
  };

  return (
    <>
      <IconButton sx={{ p: 0 }} onClick={handleOpenUserMenu}>
        <Avatar alt="Icono de usuario" sx={{ width: 40, height: 40 }} />
      </IconButton>
      <MenuTemplate anchorElement={anchorElement} onClose={handleCloseUserMenu}>
        {/* User Profile Header */}
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Avatar
            alt={username}
            sx={{
              width: 48,
              height: 48,
              bgcolor: '#667eea'
            }}
          >
            {username.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2f2f2f' }}>
              {username}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Admin
            </Typography>
          </Box>
        </Box>

        {/* Menu Items */}
        <Box sx={{ py: 1 }}>
          <Link to="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
            <MenuItem
              sx={{
                px: 3,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '100%',
                '&:hover': { backgroundColor: '#f8fafc' }
              }}
            >
              <PersonIcon sx={{ mr: 2, fontSize: 20, color: '#6b7280', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500, textAlign: 'left' }}>
                Mi perfil
              </Typography>
            </MenuItem>
          </Link>

          <MenuItem
            sx={{
              px: 3,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: '100%',
              '&:hover': { backgroundColor: '#f8fafc' }
            }}
          >
            <SettingsIcon sx={{ mr: 2, fontSize: 20, color: '#6b7280', flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500, textAlign: 'left' }}>
              Configuración
            </Typography>
          </MenuItem>

          <MenuItem
            sx={{
              px: 3,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: '100%',
              '&:hover': { backgroundColor: '#f8fafc' }
            }}
          >
            <KeyIcon sx={{ mr: 2, fontSize: 20, color: '#6b7280', flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500, textAlign: 'left' }}>
              Cambiar contraseña
            </Typography>
          </MenuItem>

          <Link to="/contact" style={{ textDecoration: 'none', color: 'inherit' }}>
            <MenuItem
              sx={{
                px: 3,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '100%',
                '&:hover': { backgroundColor: '#f8fafc' }
              }}
            >
              <HelpOutlineIcon sx={{ mr: 2, fontSize: 20, color: '#6b7280', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500, textAlign: 'left' }}>
                ¿Necesitas ayuda?
              </Typography>
            </MenuItem>
          </Link>
        </Box>

        {/* Logout Button */}
        <Box sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={logout}
            fullWidth
            variant="contained"
            startIcon={<LogoutIcon />}
            sx={{
              backgroundColor: '#ef4444',
              color: 'white',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 2,
              py: 1,
              '&:hover': {
                backgroundColor: '#dc2626',
              }
            }}
          >
            Salir
          </Button>
        </Box>
      </MenuTemplate>
    </>
  );
};
