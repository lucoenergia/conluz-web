import { Box, Drawer, Toolbar } from "@mui/material";
import type { FC } from "react";
import { MenuLinkItem } from "./MenuLinkItem";
import { LabeledIcon } from "../LabeledIcon/LabeledIcon";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MENU_ITEMS, MIN_DESKTOP_WIDTH, SIDEMENU_WIDTH } from "../../utils/constants";

interface SideMenuProps {
  isMenuOpened: boolean;
  onMenuClose: Function;
  menuItems: typeof MENU_ITEMS;
  selectedId?: string;
}

export const SideMenu: FC<SideMenuProps> = ({ isMenuOpened, onMenuClose, menuItems, selectedId }) => {
  const { width } = useWindowDimensions();
  const drawerVariant = width < MIN_DESKTOP_WIDTH ? "temporary" : "persistent";

  //The toolbar is required so the menu doesn't colide with the app bar
  return (
    <Drawer variant={drawerVariant} open={isMenuOpened} onClose={() => onMenuClose(false)}>
      <Box className="max-w-full" sx={{ width: SIDEMENU_WIDTH }}>
        <Toolbar />
        {menuItems.map((menuItem) => (
          <MenuLinkItem key={menuItem.id} selected={selectedId === menuItem.id} to={menuItem.to}>
            <LabeledIcon icon={menuItem.icon} label={menuItem.label} />
          </MenuLinkItem>
        ))}
      </Box>
    </Drawer>
  );
};
