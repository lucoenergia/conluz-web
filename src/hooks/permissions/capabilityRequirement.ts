import type {
  CommunityCapabilitiesResponse,
  PlantCapabilitiesResponse,
  PlatformCapabilitiesResponse,
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
  | { scope: "plant"; capability: keyof PlantCapabilitiesResponse };


/**
 * The same, for navigation, plus the entries that need no capability at all.
 * Sharing one vocabulary with the routes is what keeps the menu and the router
 * from drifting apart: an entry and the page it leads to name the same rule.
 *
 * No plant scope -- the menu has no entry keyed by a route parameter.
 */
export type MenuRequirement = { scope: "always" } | Exclude<CapabilityRequirement, { scope: "plant" }>;
