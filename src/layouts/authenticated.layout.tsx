import { useEffect, useMemo, useState, type FC } from "react";
import { Header } from "../components/Header/Header";
import { Outlet, useNavigate } from "react-router";
import { SideMenu } from "../components/Menu/SideMenu";
import useWindowDimensions from "../utils/useWindowDimensions";
import { CONTACT_ITEM, MENU_SECTIONS, MIN_DESKTOP_WIDTH, SIDEMENU_WIDTH } from "../utils/constants";
import { Box, CircularProgress, Toolbar } from "@mui/material";
import { ProtectedRoute } from "../components/Auth/ProtectedRoute";
import { AuthErrorBoundry } from "../components/ErrorBoundries/AuthErrorBoundry";
import { useGetCurrentUser } from "../api/users/users";
import { useLoggedUser, useLoggedUserDispatch } from "../context/logged-user.context";
import { useLogout } from "../hooks/useLogout";
import { ErrorProvider } from "../context/error.context";
import { ErrorDisplay } from "../components/Errors/ErrorDisplay";
import { useActiveCommunity } from "../context/community.context";
import { useActiveCommunityRole, useIsPlatformAdmin } from "../hooks/useActiveCommunityRole";
import { CommunityRole } from "../api/models";
import { resolveLandingRoute } from "../utils/routes";

export const AuthenticatedLayout: FC = () => {
  const { width } = useWindowDimensions();
  const navigate = useNavigate();
  const logout = useLogout();
  const loggedUser = useLoggedUser();
  const setLoggedUser = useLoggedUserDispatch();
  const activeCommunity = useActiveCommunity();
  const activeCommunityRole = useActiveCommunityRole();
  const isPlatformAdmin = useIsPlatformAdmin();
  const [isMenuOpened, setIsMenuOpened] = useState(width > MIN_DESKTOP_WIDTH);

  const hasActiveCommunity = activeCommunity !== null;

  const visibleSections = useMemo(
    () =>
      MENU_SECTIONS.filter((section) => {
        if (section.visibility === "operational") return hasActiveCommunity;
        if (section.visibility === "communityAdmin") return activeCommunityRole === CommunityRole.COMMUNITY_ADMIN;
        if (section.visibility === "platformAdmin") return isPlatformAdmin;
        return false;
      }),
    [hasActiveCommunity, activeCommunityRole, isPlatformAdmin],
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
            {loggedUser === null ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Outlet />
            )}
            <ErrorDisplay />
          </ErrorProvider>
        </AuthErrorBoundry>
      </Box>
    </ProtectedRoute>
  );
};
