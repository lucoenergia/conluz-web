import { useEffect, useMemo, useState, type FC } from "react";
import { Header } from "../components/Header/Header";
import { Outlet, useNavigate } from "react-router";
import { SideMenu } from "../components/Menu/SideMenu";
import useWindowDimensions from "../utils/useWindowDimensions";
import { CONTACT_ITEM, MENU_SECTIONS, MIN_DESKTOP_WIDTH, SIDEMENU_WIDTH } from "../utils/constants";
import { Box, Toolbar } from "@mui/material";
import { ProtectedRoute } from "../components/Auth/ProtectedRoute";
import { AuthErrorBoundry } from "../components/ErrorBoundries/AuthErrorBoundry";
import { useQueryClient } from "@tanstack/react-query";
import { useGetCurrentUser } from "../api/users/users";
import { useAuthDispatch } from "../context/auth.context";
import { useLoggedUser, useLoggedUserDispatch } from "../context/logged-user.context";
import { ErrorProvider } from "../context/error.context";
import { ErrorDisplay } from "../components/Errors/ErrorDisplay";
import { useActiveCommunity } from "../context/community.context";
import { useActiveCommunityRole, useIsPlatformAdmin } from "../hooks/useActiveCommunityRole";
import { CommunityRole } from "../api/models";
import { resolveLandingRoute } from "../utils/routes";

export const AuthenticatedLayout: FC = () => {
  const { width } = useWindowDimensions();
  const dispatchAuth = useAuthDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loggedUser = useLoggedUser();
  const setLoggedUser = useLoggedUserDispatch();
  const activeCommunity = useActiveCommunity();
  const activeCommunityRole = useActiveCommunityRole();
  const isPlatformAdmin = useIsPlatformAdmin();
  const [isMenuOpened, setIsMenuOpened] = useState(width > MIN_DESKTOP_WIDTH);

  const hasActiveCommunity = activeCommunity !== null;
  const isCommunityAdmin = isPlatformAdmin || activeCommunityRole === CommunityRole.COMMUNITY_ADMIN;

  const visibleSections = useMemo(
    () =>
      MENU_SECTIONS.filter((section) => {
        if (section.visibility === "operational") return hasActiveCommunity;
        if (section.visibility === "communityAdmin") return isCommunityAdmin;
        if (section.visibility === "platformAdmin") return isPlatformAdmin;
        return false;
      }),
    [hasActiveCommunity, isCommunityAdmin, isPlatformAdmin],
  );

  const contentMargin = useMemo(() => {
    return isMenuOpened && width > MIN_DESKTOP_WIDTH ? SIDEMENU_WIDTH : 0;
  }, [isMenuOpened, width]);

  const { data } = useGetCurrentUser({ query: { enabled: loggedUser === null } });

  useEffect(() => {
    if (data) {
      setLoggedUser(data);
      if (window.location.pathname === '/') {
        const landing = resolveLandingRoute(data);
        if (landing !== '/') navigate(landing, { replace: true });
      }
    }
  }, [data, navigate, setLoggedUser]);

  const logout = async () => {
    queryClient.clear();
    dispatchAuth(null);
    setLoggedUser(null);
    navigate("/login");
  };

  return (
    <ProtectedRoute>
      <Header
        onMenuClick={() => setIsMenuOpened(!isMenuOpened)}
        username={loggedUser?.fullName}
      />
      <SideMenu
        isMenuOpened={isMenuOpened}
        onMenuClose={setIsMenuOpened}
        sections={visibleSections}
        contactItem={CONTACT_ITEM}
      />
      <Box
        sx={{
          marginLeft: `${contentMargin}px`,
          transition: "margin 225ms cubic-bezier(0.0, 0, 0.2, 1) 0ms",
          boxSizing: "border-box",
        }}
        component="main"
      >
        <Toolbar />
        <AuthErrorBoundry onError={logout}>
          <ErrorProvider>
            <Outlet />
            <ErrorDisplay />
          </ErrorProvider>
        </AuthErrorBoundry>
      </Box>
    </ProtectedRoute>
  );
};
