"use client";

import * as Styled from "./AppBar.styles";

// ** React Imports
import { ReactNode } from "react";

// ** MUI Imports
import { useTheme } from "@mui/material/styles";

// ** Type Import
import { Settings } from "@/app/context/settingsContext";

interface Props {
  hidden: boolean;
  settings: Settings;
  toggleNavVisibility: () => void;
  saveSettings: (values: Settings) => void;
  verticalAppBarContent?: (props?: any) => ReactNode;
}

const AppBarLayout = (props: Props) => {
  // ** Props
  const { settings, verticalAppBarContent: userVerticalAppBarContent } = props;

  // ** Hooks
  const theme = useTheme();

  // ** Vars
  const { contentWidth } = settings;

  return (
    <Styled.AppBar
      elevation={0}
      color="default"
      className="layout-navbar"
      position="static"
    >
      <Styled.Toolbar
        className="navbar-content-container"
        sx={{
          ...(contentWidth === "boxed" && {
            "@media (min-width:1440px)": {
              maxWidth: `calc(1440px - ${theme.spacing(6)} * 2)`,
            },
          }),
        }}
      >
        {(userVerticalAppBarContent && userVerticalAppBarContent(props)) ||
          null}
      </Styled.Toolbar>
    </Styled.AppBar>
  );
};

export default AppBarLayout;
