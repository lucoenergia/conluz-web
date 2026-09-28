import { Suspense, useEffect, useMemo, useState, type FC } from "react";
import { Header } from "../components/Header/Header";
import { Navigate, Outlet, useNavigate } from "react-router";
import { SideMenu } from "../components/Menu/SideMenu";
import useWindowDimensions from "../utils/useWindowDimensions";
import { CONTACT_ITEM, MENU_SECTIONS, MIN_DESKTOP_WIDTH, SIDEMENU_WIDTH, visibleMenuSections } from "../utils/constants";
import { Box, CircularProgress, Toolbar } from "@mui/material";
import { radii } from "../theme/tokens";
import { RouteFallback } from "../components/RouteFallback";
import { ProtectedRoute } from "../components/Auth/ProtectedRoute";
import { AuthErrorBoundry } from "../components/ErrorBoundries/AuthErrorBoundry";
import { useGetCurrentUser } from "../api/users/users";
import { useLoggedUser, useLoggedUserDispatch } from "../context/logged-user.context";
import { useLogout } from "../hooks/useLogout";
import { ErrorProvider } from "../context/error.context";
import { ErrorDisplay } from "../components/Errors/ErrorDisplay";
import { SuccessProvider } from "../context/success.context";
import { SuccessDisplay } from "../components/Success/SuccessDisplay";
import { useActiveCommunity } from "../context/community.context";
import { useActiveCommunityRole, useIsPlatformAdmin } from "../hooks/useActiveCommunityRole";
import { CommunityRole } from "../api/models";
import { resolveLandingRoute } from "../utils/routes";
import { useCommunitySwitchRedirect } from "../hooks/useCommunitySwitchRedirect";
import { ScopeContext } from "../components/ScopeContext";

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
  const communitySwitchRedirect = useCommunitySwitchRedirect();

  const hasActiveCommunity = activeCommunity !== null;

  const visibleSections = useMemo(
    () =>
      visibleMenuSections(MENU_SECTIONS, {
        hasActiveCommunity,
        isCommunityAdmin: activeCommunityRole === CommunityRole.COMMUNITY_ADMIN,
        isPlatformAdmin,
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
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: "absolute",
          left: 8,
          top: -64,
          zIndex: (theme) => theme.zIndex.tooltip + 1,
          px: 2,
          py: 1,
          borderRadius: radii.default,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          textDecoration: "none",
          fontWeight: 600,
          "&:focus": { top: 8 },
        }}
      >
        Saltar al contenido
      </Box>
      <Header
        onMenuClick={() => setIsMenuOpened(!isMenuOpened)}
        username={loggedUser?.fullName}
      />
      {/*
        * The page scope is stated exactly once (#186): in the side-menu header
        * while the menu is open, in the strip under the app bar while it is
        * closed. Both hang off `isMenuOpened`, so the two cannot coexist, and
        * on a narrow viewport, where the menu starts closed, the strip shows
        * without the user opening anything.
        */}
      <SideMenu
        isMenuOpened={isMenuOpened}
        onMenuClose={setIsMenuOpened}
        sections={visibleSections}
        contactItem={CONTACT_ITEM}
        header={isMenuOpened ? <ScopeContext variant="menuHeader" /> : null}
      />
      <Box
        sx={{
          marginLeft: `${contentMargin}px`,
          "--content-inset-left": `${contentMargin}px`,
          transition: "margin 225ms cubic-bezier(0.0, 0, 0.2, 1) 0ms",
          boxSizing: "border-box",
        }}
        component="main"
        id="main-content"
        tabIndex={-1}
      >
        <Toolbar />
        {!isMenuOpened && <ScopeContext variant="strip" />}
        <AuthErrorBoundry onError={logout}>
          <ErrorProvider>
            <SuccessProvider>
              {loggedUser === null ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Suspense fallback={<RouteFallback />}>
                  {communitySwitchRedirect ? (
                    <Navigate to={communitySwitchRedirect} replace />
                  ) : (
                    /*
                     * Keyed on the active community so that switching remounts the
                     * routed page from scratch. React Query invalidation cannot reach
                     * data a page has already copied into useState -- the integrations
                     * form latched a community's credentials and would have saved them
                     * to the next one -- and a structural reset covers every screen
                     * that does this, including ones not written yet.
                     *
                     * Only the routed page remounts: the header (and with it the
                     * community selector), the side menu and the error/success
                     * providers all live outside this Outlet.
                     *
                     * The "none" -> id step on first load remounts each page once. That
                     * costs nothing in practice: community-scoped queries are all gated
                     * on `enabled: !!activeCommunityId` so the first mount fires none of
                     * them, and entity-scoped ones dedupe by key.
                     */
                    <Outlet key={activeCommunity ?? "none"} />
                  )}
                </Suspense>
              )}
              <SuccessDisplay />
            </SuccessProvider>
            <ErrorDisplay />
          </ErrorProvider>
        </AuthErrorBoundry>
      </Box>
    </ProtectedRoute>
  );
};
