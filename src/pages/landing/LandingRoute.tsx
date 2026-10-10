import type { FC } from "react";
import { Navigate } from "react-router";
import { useLoggedUser } from "../../context/logged-user.context";
import { useActiveCommunityCapabilities } from "../../hooks/permissions";
import { CapabilityLoadError } from "../../components/Auth/CapabilityLoadError";
import { resolveLandingRoute } from "../../utils/routes";

/**
 * "/": where every caller lands, and where every denial redirects. It has no
 * screen of its own (#221); it decides during render where the caller belongs,
 * so no page mounts here first and is then replaced.
 *
 * - No membership: the platform or the no-community screen, per
 *   resolveLandingRoute.
 * - With memberships: the home, once the backend says the caller may read the
 *   active community. That is the answer /home's own guard reads, so the guard
 *   cannot send them back here and loop. Until then -- including while the
 *   active community is still being worked out, when that answer is pending --
 *   nothing, as the home views render nothing while their answer is pending.
 *   There is nothing to choose here: a caller with memberships always has a
 *   community active once it is worked out (#237), and the community switch
 *   changes it.
 */
export const LandingRoute: FC = () => {
  const loggedUser = useLoggedUser();
  const canRead = useActiveCommunityCapabilities("canRead");

  // The layout renders no route until the user is known.
  if (!loggedUser) return null;

  const landing = resolveLandingRoute(loggedUser);
  if (landing !== "/home") return <Navigate replace to={landing} />;

  if (canRead.state === "allowed") return <Navigate replace to="/home" />;
  if (canRead.state === "error") return <CapabilityLoadError onRetry={canRead.retry} />;
  return null;
};
