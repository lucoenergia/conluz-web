import { useMemo, useState, type FC } from "react";
import { Header } from "../components/header/Header";
import { Outlet } from "react-router";
import { SideMenu } from "../components/menu/SideMenu";
import useWindowDimensions from "../utils/useWindowDimensions";
import { MIN_DESKTOP_WIDTH, SIDEMENU_WIDTH } from "../utils/constants";
import { Box, Toolbar } from "@mui/material";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";

export const AuthenticatedLayout: FC = () => {
  const { width } = useWindowDimensions();
  // For desktop view the menu starts open, for mobile view it starts collapsed
  const [isMenuOpened, setIsMenuOpened] = useState(width > MIN_DESKTOP_WIDTH)
  
  const contentMargin = useMemo(() => {
    return isMenuOpened && width > MIN_DESKTOP_WIDTH ? SIDEMENU_WIDTH : 0;
  }, [isMenuOpened, width])

  
  return <ProtectedRoute>
    <Header onMenuClick={() => {setIsMenuOpened(!isMenuOpened)}}/>
    <SideMenu isMenuOpened={isMenuOpened} onMenuClose={setIsMenuOpened}/>
    <Box sx={{ marginLeft: `${contentMargin}px`, transition: 'margin 225ms cubic-bezier(0.0, 0, 0.2, 1) 0ms'}} className="p-4" component="main">
      <Toolbar/>
      <Outlet/>
    </Box>
  </ProtectedRoute>
}
