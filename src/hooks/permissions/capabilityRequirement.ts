import type {
  CommunityCapabilitiesResponse,
  PlantCapabilitiesResponse,
  PlatformCapabilitiesResponse,
  SupplyCapabilitiesResponse,
  UserCapabilitiesResponse,
} from "../../api/models";

/**
 * Which capability something requires -- a route, or a menu entry leading to one.
 *
 * A closed union rather than a callback: a guard that could run arbitrary code
 * would become a way to fetch anything at route level, and the point of this
 * module is that access is decided in one readable place. The capability
 * name is a key of the generated type for its scope, so a typo -- or a real
 * capability borrowed from the wrong resource -- does not compile.
 */
export type CapabilityRequirement =
  | { scope: "platform"; capability: keyof PlatformCapabilitiesResponse }
  | { scope: "community"; capability: keyof CommunityCapabilitiesResponse }
  /** Reads `:plantId` from the route. */
  | { scope: "plant"; capability: keyof PlantCapabilitiesResponse }
  /** Reads `:supplyPointId` from the route. */
  | { scope: "supply"; capability: keyof SupplyCapabilitiesResponse }
  /** Reads `:userId` from the route. */
  | { scope: "user"; capability: keyof UserCapabilitiesResponse }
  /**
   * Reads `:communityId` from the route. Distinct from `community`, which is
   * the ACTIVE one: administering a community is not working in it, and a
   * platform admin administering one has no membership of it at all.
   */
  | { scope: "communityById"; capability: keyof CommunityCapabilitiesResponse };


/**
 * The same, for navigation, plus the entries that need no capability at all.
 * Sharing one vocabulary with the routes is what keeps the menu and the router
 * from drifting apart: an entry and the page it leads to name the same rule.
 *
 * No scope keyed by a route parameter -- a menu entry is a fixed destination,
 * so it has no `:plantId`, `:supplyPointId`, `:userId` or `:communityId` to
 * resolve. Excluding them here is what stops one being written.
 */
export type MenuRequirement =
  | { scope: "always" }
  | Exclude<
      CapabilityRequirement,
      { scope: "plant" } | { scope: "supply" } | { scope: "user" } | { scope: "communityById" }
    >;
