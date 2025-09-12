import { useEffect, useMemo, useState, type FC } from "react";
import { Header } from "../components/header/Header";
import { Outlet, useLocation, useNavigate } from "react-router";
import { SideMenu } from "../components/menu/SideMenu";
import useWindowDimensions from "../utils/useWindowDimensions";
import { MENU_ITEMS, MIN_DESKTOP_WIDTH, SIDEMENU_WIDTH } from "../utils/constants";
import { Box, Toolbar } from "@mui/material";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AuthErrorBoundry } from "../components/ErrorBoundries/AuthErrorBoundry";
import { useQueryClient } from "@tanstack/react-query";
import { useGetCurrentUser } from "../api/users/users";
import { useAuthDispatch } from "../context/auth.context";
import { useLoggedUser, useLoggedUserDispatch } from "../context/logged-user.context";
import { ErrorProvider } from "../context/error.context";
import { ErrorDisplay } from "../components/Errors/ErrorDisplay";

export const AuthenticatedLayout: FC = () => {
  const { width } = useWindowDimensions();
  const dispatchAuth = useAuthDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const loggedUser = useLoggedUser();
  const setLoggedUser = useLoggedUserDispatch();
  // For desktop view the menu starts open, for mobile view it starts collapsed
  const [isMenuOpened, setIsMenuOpened] = useState(width > MIN_DESKTOP_WIDTH)

  const contentMargin = useMemo(() => {
    return isMenuOpened && width > MIN_DESKTOP_WIDTH ? SIDEMENU_WIDTH : 0;
  }, [isMenuOpened, width])

  // If there is no logged user in context we query the backend and retrieve it
  const { data } = useGetCurrentUser({ query: { enabled: loggedUser === null } })

  useEffect(() => {
    if (data) {
      setLoggedUser(data)
    }
  }, [data])

  const logout = async () => {
    queryClient.clear();
    dispatchAuth(null);
    setLoggedUser(null);
    navigate('/login');
  }

  const selectedId = useMemo(() => {
    // reverse() is used since otherwise it would always match the index route '/' which is the first one and part of every other route
    return MENU_ITEMS.reverse().find(menuItem => location.pathname.includes(menuItem.to))?.id
  }, [location.key])

  return (
    <ProtectedRoute>
      <Header onMenuClick={() => { setIsMenuOpened(!isMenuOpened) }} username={loggedUser?.fullName} />
      <SideMenu isMenuOpened={isMenuOpened} onMenuClose={setIsMenuOpened} menuItems={MENU_ITEMS} selectedId={selectedId} />
      <Box sx={{ marginLeft: `${contentMargin}px`, transition: 'margin 225ms cubic-bezier(0.0, 0, 0.2, 1) 0ms' }} className="p-4" component="main">
        <Toolbar />
        <AuthErrorBoundry onError={logout}>
          <ErrorProvider>
            <Outlet />
            <ErrorDisplay/>
          </ErrorProvider>
        </AuthErrorBoundry>
      </Box>
    </ProtectedRoute>
  )
}
 
