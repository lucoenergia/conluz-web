import { Box, Drawer, Toolbar } from "@mui/material";
import type { FC } from "react";
import { MenuLinkItem } from "./MenuLinkItem";
import { LabeledIcon } from "../labeled-icon/LabeledIcon";
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import SolarPowerRoundedIcon from '@mui/icons-material/SolarPowerRounded';
import ElectricBoltRoundedIcon from '@mui/icons-material/ElectricBoltRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MIN_DESKTOP_WIDTH, SIDEMENU_WIDTH } from "../../utils/constants";

const MENU_ITEMS = [
  { to: "/", icon: HomeRoundedIcon, label: "Inicio" },
  { to: "/production", icon: SolarPowerRoundedIcon, label: "Producción" },
  { to: "/consumptio", icon: ElectricBoltRoundedIcon, label: "Consumo" },
  { to: "/memebers", icon: GroupsRoundedIcon, label: "Socios" },
  { to: "/contact", icon: SupportAgentRoundedIcon, label: "Contacto" },
  { to: "/help", icon: InfoRoundedIcon, label: "Ayuda" },
]

interface SideMenuProps {
  isMenuOpened: boolean
  onMenuClose: Function
}

export const SideMenu: FC<SideMenuProps> = ({ isMenuOpened, onMenuClose }) => {
  const { width } = useWindowDimensions();
  const drawerVariant = width < MIN_DESKTOP_WIDTH ? 'temporary' : 'persistent';

  //The toolbar is required so the menu doesn't colide with the app bar 
  return <Drawer variant={drawerVariant} open={isMenuOpened} onClose={() => onMenuClose(false)} >
    <Box className="max-w-full" sx={{ width: SIDEMENU_WIDTH}}>
      <Toolbar />
      { MENU_ITEMS.map(menuItem => 
        <MenuLinkItem to={menuItem.to}><LabeledIcon icon={menuItem.icon} label={menuItem.label} /></MenuLinkItem>
      )}
    </Box>
  </Drawer>
}
