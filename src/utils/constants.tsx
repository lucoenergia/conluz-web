import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SolarPowerRoundedIcon from "@mui/icons-material/SolarPowerRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import type { MenuRequirement } from "../hooks/permissions";

export const MIN_DESKTOP_WIDTH = 768;
export const SIDEMENU_WIDTH = 260;

export interface MenuItem {
  to: string;
  id: string;
  icon: SvgIconComponent;
  label: string;
  /**
   * What the backend must allow before this entry is offered. The same
   * vocabulary the routes use, and deliberately per item rather than per
   * section: Miembros and Integraciones sit together but are not the same
   * decision, and a section-wide rule is how the menu came to offer pages the
   * router then refused.
   */
  requires: MenuRequirement;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

const COMMUNITY_READ: MenuRequirement = { scope: "community", capability: "canRead" };

export const MENU_SECTIONS: MenuSection[] = [
  {
    id: "operational",
    title: "Operativo",
    items: [
      // Operational screens are about one community's own data, so they appear
      // once the caller may read the community they are working in -- which is
      // false when there is no active community, as before.
      { to: "/", id: "home", icon: HomeRoundedIcon, label: "Inicio", requires: COMMUNITY_READ },
      { to: "/production", id: "production", icon: SolarPowerRoundedIcon, label: "Producción", requires: COMMUNITY_READ },
      { to: "/supply-points", id: "supply-points", icon: ElectricBoltRoundedIcon, label: "Consumo", requires: COMMUNITY_READ },
    ],
  },
  {
    id: "community-management",
    title: "Gestión de comunidad",
    items: [
      { to: "/members", id: "members", icon: PeopleRoundedIcon, label: "Miembros", requires: { scope: "community", capability: "canManageMemberships" } },
      { to: "/integrations", id: "integrations", icon: ExtensionRoundedIcon, label: "Integraciones", requires: { scope: "community", capability: "canManage" } },
    ],
  },
  {
    id: "platform-admin",
    title: "Administración de plataforma",
    items: [
      { to: "/communities", id: "communities", icon: BusinessRoundedIcon, label: "Comunidades", requires: { scope: "platform", capability: "canAdministerPlatform" } },
      { to: "/users", id: "users", icon: ManageAccountsRoundedIcon, label: "Usuarios", requires: { scope: "platform", capability: "canListUsers" } },
    ],
  },
];

export const CONTACT_ITEM: MenuItem = {
  to: "/contact",
  id: "contact",
  icon: SupportAgentRoundedIcon,
  label: "Contacto",
  requires: { scope: "always" },
};
