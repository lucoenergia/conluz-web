import { Suspense, useMemo, useState, type FC } from "react";
import { Header } from "../components/Header/Header";
import { PasswordChangeHeader } from "../components/Header/PasswordChangeHeader";
import { Navigate, Outlet, useLocation } from "react-router";
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
import { resolveForcedPasswordChangeTarget } from "../utils/routes";
import { useCommunitySwitchRedirect } from "../hooks/useCommunitySwitchRedirect";
import { ScopeContext } from "../components/ScopeContext";

/**
 * The authenticated chrome, chosen by one question asked before anything else
 * mounts: must the caller change their password first (#213)?
 *
 * While they must, the backend refuses everything but reading the current
 * user, changing the password and logging out (lucoenergia/conluz#342). The
 * full layout cannot live with that: its capability lookups and the scope
 * context's community list fetch on mount, every one of them would answer 403,
 * and each 403 asks for the current user again. Mounting it and disabling its
 * queries would leave every component that fetches on its own to be found and
 * gated one by one, so it is not mounted at all -- the minimal shell is.
 *
 * Only the logged user is read here, and it is already loaded by the provider
 * above. While it is still loading the full layout renders as it always has:
 * without a user there are no memberships and no active community, so nothing
 * in it fetches yet.
 */
export const AuthenticatedLayout: FC = () => {
  const loggedUser = useLoggedUser();

  return (
    <ProtectedRoute>
      {loggedUser?.mustChangePassword === true ? <PasswordChangeShell /> : <FullLayout />}
    </ProtectedRoute>
  );
};

const SkipLink: FC = () => (
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
);

/**
 * What a caller who must change their password sees: a header with the logo and
 * a logout, and the change-password page. Nothing here reads the API; the page
 * itself only writes the new password.
 *
 * Every other route still leads to /change-password, decided during render so
 * the page asked for never mounts, not even for one frame (#196).
 */
const PasswordChangeShell: FC = () => {
  const logout = useLogout();
  const loggedUser = useLoggedUser();
  const { pathname } = useLocation();
  const forcedPasswordChangeRedirect = resolveForcedPasswordChangeTarget(loggedUser, pathname);

  return (
    <>
      <SkipLink />
      <PasswordChangeHeader />
      <Box component="main" id="main-content" tabIndex={-1}>
        <Toolbar />
        <AuthErrorBoundry onError={() => void logout()}>
          <ErrorProvider>
            <SuccessProvider>
              <Suspense fallback={<RouteFallback />}>
                {forcedPasswordChangeRedirect ? (
                  <Navigate to={forcedPasswordChangeRedirect} replace />
                ) : (
                  <Outlet />
                )}
              </Suspense>
              <SuccessDisplay />
            </SuccessProvider>
            <ErrorDisplay />
          </ErrorProvider>
        </AuthErrorBoundry>
      </Box>
    </>
  );
};

/** The layout of a caller who may use the app: header, side menu, scope context and the routed page. */
const FullLayout: FC = () => {
  const { width } = useWindowDimensions();
  const logout = useLogout();
  const loggedUser = useLoggedUser();
  const activeCommunity = useActiveCommunity();
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

  return (
    <>
      <SkipLink />
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
        <AuthErrorBoundry onError={() => void logout()}>
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
                     * Only the routed page remounts: the header, the side menu
                     * (and with it the scope context and its community switch),
                     * the context strip and the error/success providers all live
                     * outside this Outlet.
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
    </>
  );
};
