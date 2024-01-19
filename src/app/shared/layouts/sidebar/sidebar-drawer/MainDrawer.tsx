"use client";

// ** React Imports
import { ReactNode } from "react";

// ** MUI Imports
import { styled, useTheme } from "@mui/material/styles";
import MuiSwipeableDrawer, {
  SwipeableDrawerProps,
} from "@mui/material/SwipeableDrawer";

// ** Type Import
import { Settings } from "@/app/shared/context/settingsContext";
import MiniDrawer from "./MiniDrawer";

interface Props {
  hidden: boolean;
  navWidth: number;
  settings: Settings;
  navVisible: boolean;
  children: ReactNode;
  setNavVisible: (value: boolean) => void;
  saveSettings: (values: Settings) => void;
}

const SwipeableDrawer = styled(MuiSwipeableDrawer)<SwipeableDrawerProps>({
  overflowX: "hidden",
  transition: "width .25s ease-in-out",
  "& ul": {
    listStyle: "none",
  },
  "& .MuiListItem-gutters": {
    paddingLeft: 4,
    paddingRight: 4,
  },
  "& .MuiDrawer-paper": {
    left: "unset",
    right: "unset",
    overflowX: "hidden",
    transition: "width .25s ease-in-out, box-shadow .25s ease-in-out",
  },
});

const MainDrawer = (props: Props) => {
  // ** Props
  const { hidden, children, navWidth, navVisible, setNavVisible } = props;

  // ** Hook
  const theme = useTheme();

  // Drawer Props for Mobile & Tablet screens
  const MobileDrawerProps = {
    open: navVisible,
    onOpen: () => setNavVisible(true),
    onClose: () => setNavVisible(false),
    ModalProps: {
      keepMounted: true, // Better open performance on mobile.
    },
  };

  if (hidden) {
    return (
      <SwipeableDrawer
        className="layout-vertical-nav"
        variant={"temporary"}
        {...MobileDrawerProps}
        PaperProps={{ sx: { width: navWidth } }}
        sx={{
          width: navWidth,
          "& .MuiDrawer-paper": {
            borderRight: 0,
            backgroundColor: theme.palette.customColors.sideBarBg,
          },
        }}
      >
        {children}
      </SwipeableDrawer>
    );
  } else {
    return <MiniDrawer navWidth={navWidth}>{children}</MiniDrawer>;
  }
};

export default MainDrawer;
