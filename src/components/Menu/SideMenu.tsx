import { Box, Divider, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { colors, fontSizes, radii } from "../../theme/tokens";
import type { FC } from "react";
import { Link, useLocation } from "react-router";
import useWindowDimensions from "../../utils/useWindowDimensions";
import type { MenuItem, MenuSection } from "../../utils/constants";
import { MIN_DESKTOP_WIDTH, SIDEMENU_WIDTH } from "../../utils/constants";

interface SideMenuProps {
  isMenuOpened: boolean;
  onMenuClose: (open: boolean) => void;
  sections: MenuSection[];
  contactItem: MenuItem;
}

export const SideMenu: FC<SideMenuProps> = ({ isMenuOpened, onMenuClose, sections, contactItem }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const location = useLocation();
  const drawerVariant = width < MIN_DESKTOP_WIDTH ? "temporary" : "persistent";

  const isSelected = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const renderItem = (menuItem: MenuItem) => {
    const Icon = menuItem.icon;
    const selected = isSelected(menuItem.to);

    return (
      <ListItem key={menuItem.id} disablePadding sx={{ mb: 0.5 }}>
        <Link
          to={menuItem.to}
          style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}
          onClick={() => width < MIN_DESKTOP_WIDTH && onMenuClose(false)}
        >
          <ListItemButton
            selected={selected}
            sx={{
              borderRadius: radii.default,
              px: 2.5,
              py: 1.5,
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                background: theme.palette.primary.main,
                '& .MuiListItemIcon-root': { color: 'white' },
                '& .MuiListItemText-primary': { color: 'white', fontWeight: 600 },
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b4298 100%)',
                },
              },
              '&:not(.Mui-selected)': {
                '&:hover': { backgroundColor: colors.background.surface },
                '& .MuiListItemIcon-root': { color: colors.text.subtle },
                '& .MuiListItemText-primary': { color: colors.text.body },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Icon sx={{ fontSize: 22 }} />
            </ListItemIcon>
            <ListItemText
              primary={menuItem.label}
              primaryTypographyProps={{
                // eslint-disable-next-line no-restricted-syntax -- 0.9rem nav label; between fontSizes.md (0.875) and fontSizes.lg (0.9375)
                fontSize: '0.9rem',
                fontWeight: selected ? 600 : 500,
              }}
            />
          </ListItemButton>
        </Link>
      </ListItem>
    );
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
          borderRight: `1px solid ${colors.divider}`,
          background: colors.background.paper,
          // eslint-disable-next-line no-restricted-syntax -- compound drawer shadow; no matching token
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          overflowX: 'hidden',
        }
      }}
    >
      <Box sx={{ width: SIDEMENU_WIDTH, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Toolbar />

        <Box sx={{ flex: 1, overflowY: 'auto', pt: 1 }}>
          {sections.map((section, index) => (
            <Box key={section.id}>
              {index > 0 && <Divider sx={{ mx: 2, my: 1 }} />}
              <Typography
                sx={{
                  px: 3,
                  pt: 1,
                  pb: 0.5,
                  fontSize: fontSizes.xs,
                  fontWeight: 700,
                  color: colors.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {section.title}
              </Typography>
              <List sx={{ px: 2, py: 0 }}>
                {section.items.map(renderItem)}
              </List>
            </Box>
          ))}
        </Box>

        <Box>
          <Divider sx={{ mx: 2 }} />
          <List sx={{ px: 2, py: 1 }}>
            {renderItem(contactItem)}
          </List>
        </Box>
      </Box>
    </Drawer>
  );
};
