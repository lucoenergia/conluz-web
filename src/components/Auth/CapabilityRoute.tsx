import type { FC, ReactNode } from "react";
import { Navigate, useParams } from "react-router";
import {
  useActiveCommunityCapabilities,
  useCommunityCapabilities,
  usePlantCapabilities,
  usePlatformCapabilities,
  useSupplyCapabilities,
  useUserCapabilities,
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
 * fetch. The resolvers keyed by a route parameter are the exceptions -- plant,
 * supply, user and a named community -- so each is disabled unless the
 * requirement names its scope, and a platform route fires none of them.
 */
export const CapabilityRoute: FC<CapabilityRouteProps> = ({ require, children }) => {
  const { plantId, supplyPointId, userId, communityId } = useParams();

  const platform = usePlatformCapabilities(
    require.scope === "platform" ? require.capability : "canAdministerPlatform",
  );
  const community = useActiveCommunityCapabilities(
    require.scope === "community" ? require.capability : "canRead",
  );
  const plant = usePlantCapabilities(plantId, require.scope === "plant" ? require.capability : "canRead", {
    enabled: require.scope === "plant",
  });
  const supply = useSupplyCapabilities(
    supplyPointId,
    require.scope === "supply" ? require.capability : "canRead",
    { enabled: require.scope === "supply" },
  );
  const user = useUserCapabilities(userId, require.scope === "user" ? require.capability : "canRead", {
    enabled: require.scope === "user",
  });
  // The community named in the URL, not the active one. A platform admin
  // editing a community is not a member of it, so the active-community answer
  // would be about the wrong resource, or about none.
  const namedCommunity = useCommunityCapabilities(
    communityId,
    require.scope === "communityById" ? require.capability : "canRead",
    { enabled: require.scope === "communityById" },
  );

  const outcome =
    require.scope === "platform"
      ? platform
      : require.scope === "community"
        ? community
        : require.scope === "plant"
          ? plant
          : require.scope === "supply"
            ? supply
            : require.scope === "user"
              ? user
              : namedCommunity;

  if (outcome.state === "pending") return null;
  if (outcome.state === "error") return <CapabilityLoadError onRetry={outcome.retry} />;
  if (outcome.state === "denied") return <Navigate replace to="/" />;
  return children;
};
