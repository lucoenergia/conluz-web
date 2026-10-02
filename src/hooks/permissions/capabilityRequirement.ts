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
 * The platform capabilities navigation can ask about.
 *
 * Narrower than `keyof PlatformCapabilitiesResponse` on purpose. The layout
 * cannot call a hook per menu item, so it makes one fixed call per capability
 * in this union and resolves an entry against those. Naming a capability the
 * layout does not fetch used to compile and be answered by whichever branch the
 * conditional fell through to -- silently the wrong answer. Keeping the union
 * here means adding one is a type error in MENU_SECTIONS, and widening it is a
 * type error in the layout until the matching call exists.
 */
export type MenuPlatformCapability = "canAdministerPlatform" | "canListUsers";

/** The community capabilities navigation can ask about. Same reasoning. */
export type MenuCommunityCapability = "canRead" | "canManage" | "canManageMemberships";

/**
 * The same, for navigation, plus the entries that need no capability at all.
 * Sharing one vocabulary with the routes is what keeps the menu and the router
 * from drifting apart: an entry and the page it leads to name the same rule,
 * which src/contracts/routeAccess.spec.ts checks entry by entry.
 *
 * No scope keyed by a route parameter -- a menu entry is a fixed destination,
 * so it has no `:plantId`, `:supplyPointId`, `:userId` or `:communityId` to
 * resolve. Excluding them here is what stops one being written.
 */
export type MenuRequirement =
  | { scope: "always" }
  | { scope: "platform"; capability: MenuPlatformCapability }
  | { scope: "community"; capability: MenuCommunityCapability };

/**
 * The menu unions must name real capabilities: a rename in the generated model
 * has to fail here rather than leave an entry asking for something that no
 * longer exists.
 *
 * `Assert` is what makes it bite -- the constraint `T extends true` rejects
 * `false`, so a name that is no longer a key of its response type is a compile
 * error on the line below. Types only, so it costs nothing at runtime.
 */
type Assert<T extends true> = T;

type MenuPlatformNamesAreReal = Assert<
  MenuPlatformCapability extends keyof PlatformCapabilitiesResponse ? true : false
>;
type MenuCommunityNamesAreReal = Assert<
  MenuCommunityCapability extends keyof CommunityCapabilitiesResponse ? true : false
>;

export type { MenuPlatformNamesAreReal, MenuCommunityNamesAreReal };
