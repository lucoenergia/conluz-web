import * as React from "react";
import { Theme, styled, useTheme } from "@mui/material/styles";
import { Drawer as MuiDrawer, DrawerProps } from "@mui/material";

const openedMixin = (theme: Theme, navWidth: number) => ({
  width: navWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.easeIn,
    duration: theme.transitions.duration.complex,
  }),
  overflowX: "hidden",
  "& .nav-header-text": {
    opacity: 1,
  },
});

const closedMixin = (theme: Theme) => ({
  [theme.breakpoints.up("lg")]: {
    width: `calc(${theme.spacing(12)} + 20px)`,
  },
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.easeOut,
    duration: theme.transitions.duration.complex,
  }),
  overflowX: "hidden",
  "& .MuiList-root": {
    paddingRight: 5,
  },
  "& .nav-header": {
    paddingLeft: 20,
  },
  "& .nav-header-text": {
    opacity: 0,
  },
  "& .nav-section-title": {
    margin: "0 auto",
    borderBottom: "2px double grey",
    "& .MuiDivider-root": {
      display: "none",
      "& .MuiDivider-wrapper": {
        display: "none",
        "& .MuiTypography-root": {
          display: "none",
        },
      },
    },
  },
});

interface CustomDrawerProps extends DrawerProps {
  open: boolean;
  appNavWidth: number;
}

const combineStyles = (...styles: any[]) => Object.assign({}, ...styles);

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open" && prop !== "appNavWidth",
})<CustomDrawerProps>(({ theme, open, appNavWidth }) => ({
  width: appNavWidth,
  flexShrink: 1,
  whiteSpace: "nowrap",
  position: "absolute",
  ...combineStyles(
    open && {
      ...openedMixin(theme, appNavWidth),
      "& .MuiDrawer-paper": openedMixin(theme, appNavWidth),
    },
    !open && {
      ...closedMixin(theme),
      "& .MuiDrawer-paper": closedMixin(theme),
    }
  ),
  transition: "width .25s ease-in-out",
}));

interface Props {
  navWidth: number;
  children: React.ReactNode;
}

export default function MiniDrawer(props: Props) {
  // ** Props
  const { children, navWidth } = props;

  // ** Hook
  const theme = useTheme();

  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <Drawer
      variant="permanent"
      open={open}
      appNavWidth={navWidth}
      onMouseEnter={handleDrawerOpen}
      onMouseLeave={handleDrawerClose}
      sx={{
        "& .MuiDrawer-paper": {
          borderRight: 0,
          backgroundColor: theme.palette.customColors.sideBarBg,
        },
      }}
    >
      {children}
    </Drawer>
  );
}
