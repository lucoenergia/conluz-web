import { ReactNode } from "react";
import { Settings } from "@/app/shared/context/settingsContext";

export type NavLink = {
  path?: string;
  title: string;
  action?: string;
  subject?: string;
  disabled?: boolean;
  badgeContent?: string;
  externalLink?: boolean;
  openInNewTab?: boolean;
  icon?: string | string[] | ReactNode | React.FC;
  badgeColor?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "warning"
    | "info";
};

export type NavSectionTitle = {
  sectionTitle: string;
  action?: string;
  subject?: string;
};

export type VerticalNavItemsType = (NavLink | NavSectionTitle)[];

export type LayoutProps = {
  hidden: boolean;
  settings: Settings;
  children: ReactNode;
  verticalNavItems?: VerticalNavItemsType;
  scrollToTop?: (props?: any) => ReactNode;
  saveSettings: (values: Settings) => void;
  footerContent?: (props?: any) => ReactNode;
  verticalAppBarContent?: (props?: any) => ReactNode;
  verticalNavMenuContent?: (props?: any) => ReactNode;
  verticalNavMenuBranding?: (props?: any) => ReactNode;
  afterVerticalNavMenuContent?: (props?: any) => ReactNode;
  beforeVerticalNavMenuContent?: (props?: any) => ReactNode;
};

export type BlankLayoutProps = {
  children: ReactNode;
};
