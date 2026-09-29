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

/**
 * Who sees a menu item:
 * - `all`: every logged user.
 * - `communityMember`: anyone with an active community.
 * - `communityAdmin`: a COMMUNITY_ADMIN of the active community.
 * - `platformAdmin`: a platform admin, whatever the active community.
 */
export type MenuItemAccess = "all" | "communityMember" | "communityAdmin" | "platformAdmin";

export interface MenuItem {
  to: string;
  id: string;
  icon: SvgIconComponent;
  label: string;
  access: MenuItemAccess;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

/**
 * Two labelled groups by scope (#186): what belongs to the active community,
 * and what administers the platform. Personal entries (profile, password)
 * live in the profile menu, and Contacto in the menu footer.
 */
export const MENU_SECTIONS: MenuSection[] = [
  {
    id: "community",
    title: "Comunidad",
    items: [
      { to: "/", id: "home", icon: HomeRoundedIcon, label: "Inicio", access: "communityMember" },
      { to: "/production", id: "production", icon: SolarPowerRoundedIcon, label: "Producción", access: "communityMember" },
      { to: "/supply-points", id: "supply-points", icon: ElectricBoltRoundedIcon, label: "Consumo", access: "communityMember" },
      { to: "/members", id: "members", icon: PeopleRoundedIcon, label: "Miembros", access: "communityAdmin" },
      { to: "/integrations", id: "integrations", icon: ExtensionRoundedIcon, label: "Integraciones", access: "communityAdmin" },
    ],
  },
  {
    id: "platform",
    title: "Plataforma",
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

export interface MenuAccessContext {
  hasActiveCommunity: boolean;
  isCommunityAdmin: boolean;
  isPlatformAdmin: boolean;
}

function canSee(access: MenuItemAccess, context: MenuAccessContext): boolean {
  switch (access) {
    case "all":
      return true;
    case "communityMember":
      return context.hasActiveCommunity;
    case "communityAdmin":
      return context.hasActiveCommunity && context.isCommunityAdmin;
    case "platformAdmin":
      return context.isPlatformAdmin;
  }
}

/** The menu sections a user sees: each item filtered by its access, empty sections dropped. */
export function visibleMenuSections(sections: MenuSection[], context: MenuAccessContext): MenuSection[] {
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => canSee(item.access, context)) }))
    .filter((section) => section.items.length > 0);
}
