"use client";

// ** React Imports
import { ReactNode } from "react";

// ** MUI Imports
import { Theme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// ** Layout Imports
// !Do not remove this Layout import
import VerticalLayout from "@/app/shared/layouts/main/main-content/vertical-layout/VerticalLayout";

// ** Navigation Imports
import VerticalNavItems from "@/app/shared/layouts/sidebar/sidebarNavigation";

// ** Component Import
import VerticalAppBarContent from "../appbar/appbar-content/AppBarContent";

// ** Hook Import
import { useSettings } from "@/app/shared/hooks/useSettings";

interface Props {
  children: ReactNode;
}

const MainLayout = ({ children }: Props) => {
  // ** Hooks
  const { settings, saveSettings } = useSettings();

  /**
   *  The below variable will hide the current layout menu at given screen size.
   *  The menu will be accessible from the Hamburger icon only (Vertical Overlay Menu).
   *  You can change the screen size from which you want to hide the current layout menu.
   *  Please refer useMediaQuery() hook: https://mui.com/components/use-media-query/,
   *  to know more about what values can be passed to this hook.
   *  ! Do not change this value unless you know what you are doing. It can break the template.
   */
  const hidden = useMediaQuery((theme: Theme) => theme.breakpoints.down("lg"));

  return (
    <VerticalLayout
      hidden={hidden}
      settings={settings}
      saveSettings={saveSettings}
      verticalNavItems={VerticalNavItems()} // Navigation Items
      verticalAppBarContent={(
        props // AppBar Content
      ) => (
        <VerticalAppBarContent
          hidden={hidden}
          settings={settings}
          saveSettings={saveSettings}
          toggleNavVisibility={props.toggleNavVisibility}
        />
      )}
    >
      {children}
    </VerticalLayout>
  );
};

export default MainLayout;
