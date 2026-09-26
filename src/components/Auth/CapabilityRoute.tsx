import type { FC, ReactNode } from "react";
import { Navigate, useParams } from "react-router";
import {
  useActiveCommunityCapabilities,
  usePlantCapabilities,
  usePlatformCapabilities,
} from "../../hooks/permissions";
import { CapabilityLoadError } from "./CapabilityLoadError";
import type { CapabilityRequirement } from "../../hooks/permissions";

export type { CapabilityRequirement };

interface CapabilityRouteProps {
  require: CapabilityRequirement;
  children: ReactNode;
}

/**
 * Lets the children render only when the backend says the user may see them.
 *
 * The four outcomes are handled separately on purpose:
 *
 *   pending -- render nothing. Deciding before the answer arrives is the bug
 *     that bounces a community admin off a deep link, because the active
 *     community is still being worked out on the first render;
 *   allowed -- the page;
 *   denied  -- home, replacing history so Back does not return to a dead end;
 *   error   -- neither. A failed check is not a refusal, so it must not
 *     redirect; it offers a retry instead.
 *
 * Every scope resolves on every render, so the hook order is fixed regardless
 * of which requirement is passed, and only the result of the matching one is
 * read. That costs nothing it would not otherwise cost: platform capabilities
 * are a context read; the community query is the one the side menu already
 * makes on every authenticated page, so React Query serves both from a single
 * fetch. The plant resolver is the exception -- it is keyed by a route
 * parameter that other routes do not have -- so it is disabled unless the
 * requirement is a plant one, and a platform route fires no plant request.
 */
export const CapabilityRoute: FC<CapabilityRouteProps> = ({ require, children }) => {
  const { plantId } = useParams();

  const platform = usePlatformCapabilities(
    require.scope === "platform" ? require.capability : "canAdministerPlatform",
  );
  const community = useActiveCommunityCapabilities(
    require.scope === "community" ? require.capability : "canRead",
  );
  const plant = usePlantCapabilities(plantId, require.scope === "plant" ? require.capability : "canRead", {
    enabled: require.scope === "plant",
  });

  const outcome =
    require.scope === "platform" ? platform : require.scope === "community" ? community : plant;

  if (outcome.state === "pending") return null;
  if (outcome.state === "error") return <CapabilityLoadError onRetry={outcome.retry} />;
  if (outcome.state === "denied") return <Navigate replace to="/" />;
  return children;
};
