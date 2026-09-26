import type { FC, ReactNode } from "react";
import { Navigate, useParams } from "react-router";
import type {
  CommunityCapabilitiesResponse,
  PlantCapabilitiesResponse,
  PlatformCapabilitiesResponse,
} from "../../api/models";
import {
  useActiveCommunityCapabilities,
  usePlantCapabilities,
  usePlatformCapabilities,
} from "../../hooks/permissions";
import { CapabilityLoadError } from "./CapabilityLoadError";

/**
 * Which capability a route requires.
 *
 * A closed union rather than a callback: a guard that could run arbitrary code
 * would become a way to fetch anything at route level, and the point of this
 * module is that route access is decided in one readable place. The capability
 * name is a key of the generated type for its scope, so a typo -- or a real
 * capability borrowed from the wrong resource -- does not compile.
 */
export type CapabilityRequirement =
  | { scope: "platform"; capability: keyof PlatformCapabilitiesResponse }
  | { scope: "community"; capability: keyof CommunityCapabilitiesResponse }
  /** Reads `:plantId` from the route. */
  | { scope: "plant"; capability: keyof PlantCapabilitiesResponse };

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
