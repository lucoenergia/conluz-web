/**
 * The one place this app decides what a user may see or do.
 *
 * Every answer comes from the backend, as a capability on the resource it
 * concerns. Nothing outside this folder reads a role or the platform-admin
 * flag to make a decision -- a lint rule enforces that -- so a rule can only
 * ever be wrong in one place, and it is wrong in the same way the backend is.
 *
 * Reading `user.isPlatformAdmin` as a piece of data to display stays fine. It
 * is deciding on it that does not.
 */
export {
  type CapabilityOutcome,
  decide,
  isDenial,
  outcomeFromQuery,
  outcomeFromResource,
  DENIED,
  PENDING,
} from "./capabilityOutcome";
export type {
  CapabilityRequirement,
  MenuRequirement,
  MenuCommunityCapability,
  MenuPlatformCapability,
} from "./capabilityRequirement";
export { usePlatformCapabilities } from "./usePlatformCapabilities";
export { useActiveCommunityCapabilities } from "./useActiveCommunityCapabilities";
export { useCommunityCapabilities } from "./useCommunityCapabilities";
export { useUserCapabilities } from "./useUserCapabilities";
export { usePlantCapabilities } from "./usePlantCapabilities";
export { useSupplyCapabilities } from "./useSupplyCapabilities";
export { Can } from "./Can";
export { useActiveCommunityRoleLabel } from "./roleLabel";
