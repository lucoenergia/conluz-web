import { Box, Drawer, Toolbar, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import type { FC } from "react";
import { Link, useLocation } from "react-router";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MENU_ITEMS, MIN_DESKTOP_WIDTH, SIDEMENU_WIDTH } from "../../utils/constants";

interface SideMenuProps {
  isMenuOpened: boolean;
  onMenuClose: Function;
  menuItems: typeof MENU_ITEMS;
}

export const SideMenu: FC<SideMenuProps> = ({ isMenuOpened, onMenuClose, menuItems }) => {
  const { width } = useWindowDimensions();
  const location = useLocation();
  const drawerVariant = width < MIN_DESKTOP_WIDTH ? "temporary" : "persistent";

  const isSelected = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Drawer
      variant={drawerVariant}
      open={isMenuOpened}
      onClose={() => onMenuClose(false)}
      sx={{
        '& .MuiDrawer-paper': {
          width: SIDEMENU_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid #e5e7eb',
          background: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          overflowX: 'hidden',
        }
      }}
    >
      <Box sx={{ width: SIDEMENU_WIDTH, overflow: 'hidden' }}>
        <Toolbar />

        {/* Navigation Items */}
        <List sx={{ px: 2, pt: 2 }}>
          {menuItems.map((menuItem) => {
            const Icon = menuItem.icon;
            const selected = isSelected(menuItem.to);

            return (
              <ListItem key={menuItem.id} disablePadding sx={{ mb: 0.5 }}>
                <Link
                  to={menuItem.to}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    width: '100%'
                  }}
                  onClick={() => width < MIN_DESKTOP_WIDTH && onMenuClose(false)}
                >
                  <ListItemButton
                    selected={selected}
                    sx={{
                      borderRadius: 2,
                      px: 2.5,
                      py: 1.5,
                      transition: 'all 0.2s ease',
                      '&.Mui-selected': {
                        background: '#667eea',
                        '& .MuiListItemIcon-root': {
                          color: '#ffffff',
                        },
                        '& .MuiListItemText-primary': {
                          color: '#ffffff',
                          fontWeight: 600,
                        },
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a67d8 0%, #6b4298 100%)',
                        },
                      },
                      '&:not(.Mui-selected)': {
                        '&:hover': {
                          backgroundColor: '#f8fafc',
                        },
                        '& .MuiListItemIcon-root': {
                          color: '#6b7280',
                        },
                        '& .MuiListItemText-primary': {
                          color: '#374151',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Icon sx={{ fontSize: 22 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={menuItem.label}
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                        fontWeight: selected ? 600 : 500,
                      }}
                    />
                  </ListItemButton>
                </Link>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
};
