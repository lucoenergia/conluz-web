/**
 * The capability names are keys of the generated types, so a typo or a name
 * borrowed from the wrong resource must fail to compile. That guarantee is only
 * real if something checks it, and a probe that gets deleted after one run
 * checks nothing -- so it lives here and `tsc -b` re-proves it on every build.
 *
 * Nothing imports this file and nothing calls these functions; they exist to be
 * type-checked. Named `use*` so the rules-of-hooks lint accepts hook calls in them.
 */
import { useActiveCommunityCapabilities } from "./useActiveCommunityCapabilities";
import { useCommunityCapabilities } from "./useCommunityCapabilities";
import { usePlantCapabilities } from "./usePlantCapabilities";
import { usePlatformCapabilities } from "./usePlatformCapabilities";
import { useSupplyCapabilities } from "./useSupplyCapabilities";
import { useUserCapabilities } from "./useUserCapabilities";

// Valid names compile.
export function useValidCapabilityNames() {
  usePlatformCapabilities("canAdministerPlatform");
  useActiveCommunityCapabilities("canManageMemberships");
  usePlantCapabilities("plant-id", "canListSharingAgreements");
  useSupplyCapabilities("supply-id", "canEdit");
  useUserCapabilities("user-id", "canGrantPlatformAdmin");
  useCommunityCapabilities("community-id", "canUpdate");
}

export function useRejectedCapabilityNames() {
  // @ts-expect-error -- misspelt
  usePlatformCapabilities("canAdministerPlatfrom");
  // @ts-expect-error -- not a capability at all
  useActiveCommunityCapabilities("canDoAnything");
  // @ts-expect-error -- a real capability, but on the community, not the plant
  usePlantCapabilities("plant-id", "canManageMemberships");
  // @ts-expect-error -- a real capability, but on the plant, not the platform
  usePlatformCapabilities("canReadSupply");
  // @ts-expect-error -- a real capability, but on the plant, not the supply
  useSupplyCapabilities("supply-id", "canListSharingAgreements");
  // @ts-expect-error -- the community's flag is plural and answers for the community
  useSupplyCapabilities("supply-id", "canCreatePlants");
  // @ts-expect-error -- a real capability, but on the community, not the user
  useUserCapabilities("user-id", "canManageMemberships");
  // @ts-expect-error -- a real capability, but on the user, not the community
  useCommunityCapabilities("community-id", "canGrantPlatformAdmin");
  // @ts-expect-error -- the platform asks whether ANY community may be created; a
  // named community cannot be asked that about itself
  useCommunityCapabilities("community-id", "canCreateCommunity");
}
