import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SolarPowerRoundedIcon from "@mui/icons-material/SolarPowerRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
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

export type SectionVisibility = "operational" | "communityAdmin" | "platformAdmin";

export interface MenuSection {
  id: string;
  title: string;
  visibility: SectionVisibility;
  items: MenuItem[];
}

export const MENU_SECTIONS: MenuSection[] = [
  {
    id: "operational",
    title: "Operativo",
    visibility: "operational",
    items: [
      { to: "/", id: "home", icon: HomeRoundedIcon, label: "Inicio", access: "all" },
      { to: "/production", id: "production", icon: SolarPowerRoundedIcon, label: "Producción", access: "all" },
      { to: "/supply-points", id: "supply-points", icon: ElectricBoltRoundedIcon, label: "Consumo", access: "all" },
    ],
  },
  {
    id: "community-management",
    title: "Gestión de comunidad",
    visibility: "communityAdmin",
    items: [
      { to: "/members", id: "members", icon: PeopleRoundedIcon, label: "Miembros", access: "communityAdmin" },
      { to: "/integrations", id: "integrations", icon: ExtensionRoundedIcon, label: "Integraciones", access: "communityAdmin" },
    ],
  },
  {
    id: "platform-admin",
    title: "Administración de plataforma",
    visibility: "platformAdmin",
    items: [
      { to: "/communities", id: "communities", icon: BusinessRoundedIcon, label: "Comunidades", access: "platformAdmin" },
      { to: "/users", id: "users", icon: ManageAccountsRoundedIcon, label: "Usuarios", access: "platformAdmin" },
    ],
  },
];

export const CONTACT_ITEM: MenuItem = {
  to: "/contact",
  id: "contact",
  icon: SupportAgentRoundedIcon,
  label: "Contacto",
  access: "all",
};
