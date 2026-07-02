import { Avatar, IconButton, MenuItem, Box, Typography, Button } from "@mui/material";
import { useState, type FC } from "react";
import { Link } from "react-router";
import PersonIcon from "@mui/icons-material/Person";
import KeyIcon from "@mui/icons-material/Key";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import { MenuTemplate } from "./MenuTemplate";
import { colors, fontSizes } from "../../theme/tokens";
import { useActiveCommunityRole, useIsPlatformAdmin } from "../../hooks/useActiveCommunityRole";
import { useLogout } from "../../hooks/useLogout";
import { CommunityRole } from "../../api/models";

interface ProfileMenuProps {
  username: string;
}

export const ProfileMenu: FC<ProfileMenuProps> = ({ username }) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const logout = useLogout();
  const isPlatformAdmin = useIsPlatformAdmin();
  const communityRole = useActiveCommunityRole();

  const roleLabel = isPlatformAdmin
    ? "Administrador de plataforma"
    : communityRole === CommunityRole.COMMUNITY_ADMIN
    ? "Administrador de comunidad"
    : communityRole === CommunityRole.COMMUNITY_MEMBER
    ? "Miembro"
    : "";

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElement(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElement(null);
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
              bgcolor: 'primary.main'
            }}
          >
            {username.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            {/* eslint-disable-next-line no-restricted-syntax -- near-black heading; no matching token (#2f2f2f vs text.primary #1e293b) */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2f2f2f' }}>
              {username}
            </Typography>
            {roleLabel && (
              <Typography variant="body2" sx={{ color: colors.text.subtle, fontSize: fontSizes.md }}>
                {roleLabel}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Menu Items */}
        <Box sx={{ py: 1 }}>
          <Box component={Link} to="/profile" sx={{ textDecoration: 'none', color: 'inherit' }}>
            <MenuItem onClick={handleCloseUserMenu}>
              <PersonIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: 'left' }}>
                Mi perfil
              </Typography>
            </MenuItem>
          </Box>

          <Box component={Link} to="/change-password" sx={{ textDecoration: 'none', color: 'inherit' }}>
            <MenuItem onClick={handleCloseUserMenu}>
              <KeyIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: 'left' }}>
                Cambiar contraseña
              </Typography>
            </MenuItem>
          </Box>

          <Box component={Link} to="/contact" sx={{ textDecoration: 'none', color: 'inherit' }}>
            <MenuItem onClick={handleCloseUserMenu}>
              <HelpOutlineIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: 'left' }}>
                ¿Necesitas ayuda?
              </Typography>
            </MenuItem>
          </Box>
        </Box>

        {/* Logout Button */}
        <Box sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={logout}
            fullWidth
            variant="contained"
            startIcon={<LogoutIcon />}
            sx={{
              backgroundColor: colors.error.main,
              color: 'white',
              fontWeight: 500,
              py: 1,
              '&:hover': {
                backgroundColor: colors.error.dark,
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
