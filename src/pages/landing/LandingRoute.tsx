import type { FC } from "react";
import { Navigate } from "react-router";
import { useLoggedUser } from "../../context/logged-user.context";
import { useActiveCommunity, useIsActiveCommunityResolved } from "../../context/community.context";
import { useActiveCommunityCapabilities } from "../../hooks/permissions";
import { CapabilityLoadError } from "../../components/Auth/CapabilityLoadError";
import { resolveLandingRoute } from "../../utils/routes";
import { ChooseCommunityPage } from "./ChooseCommunityPage";

/**
 * "/": where every caller lands, and where every denial redirects. It has no
 * screen of its own (#221); it decides during render where the caller belongs,
 * so no page mounts here first and is then replaced.
 *
 * - No membership: the platform or the no-community screen, per
 *   resolveLandingRoute.
 * - The active community not yet worked out: nothing, as the home views render
 *   nothing while their answer is pending.
 * - Worked out, and none is active -- several memberships and no choice made:
 *   the prompt to choose one.
 * - One is active: the home, once the backend says the caller may read it. That
 *   is the answer /home's own guard reads, so the guard cannot send them back
 *   here and loop.
 */
export const LandingRoute: FC = () => {
  const loggedUser = useLoggedUser();
  const activeCommunityId = useActiveCommunity();
  const isResolved = useIsActiveCommunityResolved();
  const canRead = useActiveCommunityCapabilities("canRead");

  // The layout renders no route until the user is known.
  if (!loggedUser) return null;

  const landing = resolveLandingRoute(loggedUser);
  if (landing !== "/home") return <Navigate replace to={landing} />;

  if (!isResolved) return null;
  if (activeCommunityId === null) return <ChooseCommunityPage />;

  if (canRead.state === "allowed") return <Navigate replace to="/home" />;
  if (canRead.state === "error") return <CapabilityLoadError onRetry={canRead.retry} />;
  return null;
};
