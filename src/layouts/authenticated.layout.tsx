import { Suspense, useEffect, useMemo, useRef, useState, type FC } from "react";
import { Header } from "../components/Header/Header";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { SideMenu } from "../components/Menu/SideMenu";
import useWindowDimensions from "../utils/useWindowDimensions";
import { CONTACT_ITEM, MENU_SECTIONS, MIN_DESKTOP_WIDTH, SIDEMENU_WIDTH } from "../utils/constants";
import { Box, CircularProgress, Toolbar } from "@mui/material";
import { radii } from "../theme/tokens";
import { RouteFallback } from "../components/RouteFallback";
import { ProtectedRoute } from "../components/Auth/ProtectedRoute";
import { AuthErrorBoundry } from "../components/ErrorBoundries/AuthErrorBoundry";
import { useLoggedUser } from "../context/logged-user.context";
import { useLogout } from "../hooks/useLogout";
import { ErrorProvider } from "../context/error.context";
import { ErrorDisplay } from "../components/Errors/ErrorDisplay";
import { SuccessProvider } from "../context/success.context";
import { SuccessDisplay } from "../components/Success/SuccessDisplay";
import { useActiveCommunity } from "../context/community.context";
import {
  useActiveCommunityCapabilities,
  usePlatformCapabilities,
  type CapabilityOutcome,
  type MenuCommunityCapability,
  type MenuPlatformCapability,
  type MenuRequirement,
} from "../hooks/permissions";
import { selectVisibleSections } from "../utils/menuVisibility";
import { resolveLandingRoute } from "../utils/routes";
import { useCommunitySwitchRedirect } from "../hooks/useCommunitySwitchRedirect";

export const AuthenticatedLayout: FC = () => {
  const { width } = useWindowDimensions();
  const navigate = useNavigate();
  const logout = useLogout();
  const loggedUser = useLoggedUser();
  const activeCommunity = useActiveCommunity();
  const { pathname } = useLocation();
  const [isMenuOpened, setIsMenuOpened] = useState(width > MIN_DESKTOP_WIDTH);
  const communitySwitchRedirect = useCommunitySwitchRedirect();

  // One lookup per capability the menu asks about. Fixed calls rather than a
  // loop, because the set of questions is known and hooks cannot be called per
  // item. All share the queries the route guards already make.
  const canReadCommunity = useActiveCommunityCapabilities("canRead");
  const canManageCommunity = useActiveCommunityCapabilities("canManage");
  const canManageMemberships = useActiveCommunityCapabilities("canManageMemberships");
  const canAdministerPlatform = usePlatformCapabilities("canAdministerPlatform");
  const canListUsers = usePlatformCapabilities("canListUsers");

  const visibleSections = useMemo(() => {
    // Only "allowed" offers an entry. Pending and error both hide it: a menu is
    // not the place to report that a permission check failed, and an entry that
    // appears before the answer arrives would flicker away again.
    // Keyed rather than a chain of comparisons. The chain ended in a
    // fall-through on both scopes, so a menu entry naming a capability with no
    // call of its own was answered by canListUsers or canReadCommunity -- a
    // confident wrong answer. A Record over the menu capability unions cannot
    // fall through: widening either union is a type error here until the
    // matching call above exists.
    const platformOutcomes: Record<MenuPlatformCapability, CapabilityOutcome> = {
      canAdministerPlatform,
      canListUsers,
    };
    const communityOutcomes: Record<MenuCommunityCapability, CapabilityOutcome> = {
      canRead: canReadCommunity,
      canManage: canManageCommunity,
      canManageMemberships,
    };

    const isAllowed = (requirement: MenuRequirement): boolean => {
      if (requirement.scope === "always") return true;
      const outcome =
        requirement.scope === "platform"
          ? platformOutcomes[requirement.capability]
          : communityOutcomes[requirement.capability];
      return outcome.state === "allowed";
    };

    return selectVisibleSections(MENU_SECTIONS, isAllowed);
  }, [canReadCommunity, canManageCommunity, canManageMemberships, canAdministerPlatform, canListUsers]);

  const contentMargin = useMemo(() => {
    return isMenuOpened && width > MIN_DESKTOP_WIDTH ? SIDEMENU_WIDTH : 0;
  }, [isMenuOpened, width]);

  /**
   * Which user has already been sent to their landing route.
   *
   * Landing is a once-per-session event, and the signed-in user is a live query
   * now (#203), so this effect runs again on any refetch that changes the
   * payload. Keyed on the id rather than latched on a boolean: a refetch for
   * the same person must not re-navigate somebody who has since gone
   * elsewhere, and the next person to sign in must still land.
   */
  const landedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!loggedUser || landedForUserId.current === loggedUser.id) return;
    // The router's path, not `window.location`: the two agree in the browser,
    // but under MemoryRouter the latter is "/" for every route, which is why
    // this condition had no test until now.
    //
    // Returning WITHOUT recording anything is the point. Somebody who deep
    // links to a page they may not see is sent here by CapabilityRoute, and
    // they must still land afterwards -- a platform admin bounced off
    // /integrations belongs on /platform, not on the no-community home. So the
    // decision is deferred until they are actually on the landing route, and
    // only then counted as made.
    if (pathname !== '/') return;
    landedForUserId.current = loggedUser.id;
    const landing = resolveLandingRoute(loggedUser);
    if (landing !== '/') navigate(landing, { replace: true });
  }, [loggedUser, pathname, navigate]);

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
      <SideMenu
        isMenuOpened={isMenuOpened}
        onMenuClose={setIsMenuOpened}
        sections={visibleSections}
        contactItem={CONTACT_ITEM}
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
