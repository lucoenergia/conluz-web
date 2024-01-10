"use client";

// ** React Imports
import { useState } from "react";

// ** MUI Imports
import Fab from "@mui/material/Fab";
import { styled } from "@mui/material/styles";
import Box, { BoxProps } from "@mui/material/Box";

// ** Icons Imports
import ArrowUp from "mdi-material-ui/ArrowUp";

// ** Theme Config Import
import themeConfig from "@/app/configs/themeConfig";

// ** Type Import
import { LayoutProps } from "@/app/shared/layouts/types";

// ** Components
import AppBar from "@/app/shared/layouts/appbar/appbar-layout/AppBarLayout";
import SidebarNavigation from "@/app/shared/layouts/sidebar/MainSidebar";
import Footer from "@/app/shared/layouts/footer/footer-layout/FooterLayout";
import ScrollToTop from "@/app/shared/components/scroll-to-top/ScrollToTop";

// ** Styled Component
import DatePickerWrapper from "@/app/shared/styles/libs/react-datepicker/DatePickerWrapper";

//TODO: added marginLeft: 70px for the mini drawer
const VerticalLayoutWrapper = styled("div")(({ theme }) => ({
  height: "100%",
  display: "flex",
  [theme.breakpoints.up("lg")]: {
    marginLeft: "70px",
  },
}));

const MainContentWrapper = styled(Box)<BoxProps>({
  flexGrow: 1,
  minWidth: 0,
  display: "flex",
  minHeight: "100vh",
  flexDirection: "column",
});

const ContentWrapper = styled("main")(({ theme }) => ({
  flexGrow: 1,
  width: "100%",
  padding: theme.spacing(6),
  transition: "padding .25s ease-in-out",
  [theme.breakpoints.down("sm")]: {
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(4),
  },
}));

const VerticalLayout = (props: LayoutProps) => {
  // ** Props
  const { settings, children, scrollToTop } = props;

  // ** Vars
  const { contentWidth } = settings;
  const navWidth = themeConfig.navigationSize;

  // ** States
  const [navVisible, setNavVisible] = useState<boolean>(false);

  // ** Toggle Functions
  const toggleNavVisibility = () => setNavVisible(!navVisible);

  return (
    <>
      <VerticalLayoutWrapper className="layout-wrapper">
        {/* Navigation Menu */}
        <SidebarNavigation
          navWidth={navWidth}
          navVisible={navVisible}
          setNavVisible={setNavVisible}
          toggleNavVisibility={toggleNavVisibility}
          {...props}
        />
        <MainContentWrapper className="layout-content-wrapper">
          {/* AppBar Component */}
          <AppBar toggleNavVisibility={toggleNavVisibility} {...props} />

          {/* Content */}
          <ContentWrapper
            className="layout-page-content"
            sx={{
              ...(contentWidth === "boxed" && {
                mx: "auto",
                "@media (min-width:1440px)": { maxWidth: 1440 },
                "@media (min-width:1200px)": { maxWidth: "100%" },
              }),
            }}
          >
            {children}
          </ContentWrapper>

          {/* Footer Component */}
          <Footer {...props} />

          {/* Portal for React Datepicker */}
          <DatePickerWrapper sx={{ zIndex: 11 }}>
            <Box id="react-datepicker-portal"></Box>
          </DatePickerWrapper>
        </MainContentWrapper>
      </VerticalLayoutWrapper>

      {/* Scroll to top button */}
      {scrollToTop ? (
        scrollToTop(props)
      ) : (
        <ScrollToTop className="mui-fixed">
          <Fab color="primary" size="small" aria-label="scroll back to top">
            <ArrowUp />
          </Fab>
        </ScrollToTop>
      )}
    </>
  );
};

export default VerticalLayout;
