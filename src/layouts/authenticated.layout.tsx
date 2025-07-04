import { useState, type FC } from "react";
import { Header } from "../components/header/Header";
import { Outlet } from "react-router";
import { SideMenu } from "../components/menu/SideMenu";
import useWindowDimensions from "../utils/useWindowDimensions";
import { MIN_DESKTOP_WIDTH } from "../utils/constants";

export const AuthenticatedLayout: FC = () => {
  const { width } = useWindowDimensions();
  // For desktop view the menu starts open, for mobile view it starts collapsed
  const [isMenuOpened, setIsMenuOpened] = useState(width > MIN_DESKTOP_WIDTH)
  
  return <>
    <Header onMenuClick={() => {setIsMenuOpened(!isMenuOpened)}}/>
    <SideMenu isMenuOpened={isMenuOpened} onMenuClose={setIsMenuOpened}/>
    <Outlet/>
  </>
}
