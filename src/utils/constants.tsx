import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SolarPowerRoundedIcon from "@mui/icons-material/SolarPowerRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import type { SvgIconComponent } from "@mui/icons-material";

export const MIN_DESKTOP_WIDTH = 768;
export const SIDEMENU_WIDTH = 260;

export type MenuItemAccess = "all" | "communityAdmin" | "platformAdmin";

export interface MenuItem {
  to: string;
  id: string;
  icon: SvgIconComponent;
  label: string;
  access: MenuItemAccess;
}

export const MENU_ITEMS: MenuItem[] = [
  { to: "/", id: "home", icon: HomeRoundedIcon, label: "Inicio", access: "all" },
  { to: "/production", id: "production", icon: SolarPowerRoundedIcon, label: "Producción", access: "all" },
  { to: "/supply-points", id: "supply-points", icon: ElectricBoltRoundedIcon, label: "Consumo", access: "all" },
  { to: "/partners", id: "partners", icon: GroupsRoundedIcon, label: "Socios", access: "communityAdmin" },
  { to: "/members", id: "members", icon: PeopleRoundedIcon, label: "Miembros", access: "communityAdmin" },
  { to: "/contact", id: "contact", icon: SupportAgentRoundedIcon, label: "Contacto", access: "all" },
  { to: "/integrations", id: "integrations", icon: ExtensionRoundedIcon, label: "Integraciones", access: "communityAdmin" },
  { to: "/communities", id: "communities", icon: BusinessRoundedIcon, label: "Comunidades", access: "platformAdmin" },
];
