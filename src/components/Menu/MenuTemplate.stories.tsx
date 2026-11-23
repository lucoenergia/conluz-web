import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, Box, Divider, IconButton, ListItemIcon, ListItemText, MenuItem, Typography } from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { colors } from "../../theme/tokens";
import { MenuTemplate } from "./MenuTemplate";

const meta = {
  title: "Navigation/MenuTemplate",
  component: MenuTemplate,
} satisfies Meta<typeof MenuTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The profile menu's content, opened at its avatar button on mount. */
const ProfileMenu = () => {
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => setAnchor(trigger), [trigger]);
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", pr: 4, pt: 2, minHeight: 300 }}>
      <IconButton ref={setTrigger} aria-label="Abrir menú de usuario" onClick={(event) => setAnchor(event.currentTarget)}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>L</Avatar>
      </IconButton>
      <MenuTemplate anchorElement={anchor} onClose={() => setAnchor(null)}>
        <Box sx={{ px: 2.5, py: 2, bgcolor: colors.background.surface }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Lucía Ferrer
          </Typography>
          <Typography variant="caption" sx={{ color: colors.text.subtle }}>
            lucia.ferrer@example.org
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ py: 1 }}>
          <MenuItem>
            <ListItemIcon>
              <PersonOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mi perfil</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <LockResetIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Cambiar contraseña</ListItemText>
          </MenuItem>
          <Divider sx={{ my: 1 }} />
          <MenuItem sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "error.main" }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Cerrar sesión</ListItemText>
          </MenuItem>
        </Box>
      </MenuTemplate>
    </Box>
  );
};

export const ProfileMenuOpen: Story = {
  args: { anchorElement: null, onClose: () => {}, children: null },
  render: () => <ProfileMenu />,
};
