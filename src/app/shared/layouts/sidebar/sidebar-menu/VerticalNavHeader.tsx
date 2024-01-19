"use client";

// ** React Import
import { ReactNode } from "react";

// ** Next Import
import Link from "next/link";

// ** MUI Imports
import Box, { BoxProps } from "@mui/material/Box";
import { styled, useTheme } from "@mui/material/styles";
import Typography, { TypographyProps } from "@mui/material/Typography";

// ** Type Import
import { Settings } from "@/app/shared/context/settingsContext";

// ** Configs
import themeConfig from "@/app/shared/configs/themeConfig";

interface Props {
  hidden: boolean;
  settings: Settings;
  toggleNavVisibility: () => void;
  saveSettings: (values: Settings) => void;
  verticalNavMenuBranding?: (props?: any) => ReactNode;
}

// ** Styled Components
const MenuHeaderWrapper = styled(Box)<BoxProps>(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingRight: theme.spacing(4.5),
  transition: "padding .25s ease-in-out",
  minHeight: theme.mixins.toolbar.minHeight,
}));

const HeaderTitle = styled(Typography)<TypographyProps>(({ theme }) => ({
  fontWeight: 400,
  fontFamily: `var(--font-rye)`,
  lineHeight: "normal",
  textTransform: "uppercase",
  color: theme.palette.common.black,
  transition: "opacity .25s ease-in-out, margin .25s ease-in-out",
}));

const StyledLink = styled(Link)({
  display: "flex",
  alignItems: "center",
  textDecoration: "none",
});

// Styled component for the image
const Img = styled("img")({
  height: 50,
  width: 50,
  marginLeft: -11,
});

const VerticalNavHeader = (props: Props) => {
  // ** Props
  const { verticalNavMenuBranding: userVerticalNavMenuBranding } = props;

  // ** Hooks
  const theme = useTheme();

  return (
    <MenuHeaderWrapper className="nav-header" sx={{ pl: 6 }}>
      {userVerticalNavMenuBranding ? (
        userVerticalNavMenuBranding(props)
      ) : (
        <StyledLink href="/">
          <Img alt="App mini logo" src="/images/logos/mini-logo.png" />
          <HeaderTitle className="nav-header-text" variant="h5" sx={{ ml: 3 }}>
            {themeConfig.templateName}
          </HeaderTitle>
        </StyledLink>
      )}
    </MenuHeaderWrapper>
  );
};

export default VerticalNavHeader;
