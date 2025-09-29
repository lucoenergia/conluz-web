import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SolarPowerRoundedIcon from "@mui/icons-material/SolarPowerRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";

export const MIN_DESKTOP_WIDTH = 768;
export const SIDEMENU_WIDTH = 260;

export const MENU_ITEMS = [
  { to: "/", id: "home", icon: HomeRoundedIcon, label: "Inicio" },
  { to: "/production", id: "production", icon: SolarPowerRoundedIcon, label: "Producción" },
  { to: "/supply-points", id: "supply-points", icon: ElectricBoltRoundedIcon, label: "Consumo" },
  { to: "/memebers", id: "members", icon: GroupsRoundedIcon, label: "Socios" },
  { to: "/contact", id: "contact", icon: SupportAgentRoundedIcon, label: "Contacto" },
  { to: "/help", id: "help", icon: InfoRoundedIcon, label: "Ayuda" },
];
