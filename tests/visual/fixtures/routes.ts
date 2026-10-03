import type { Page, Route } from "@playwright/test";
import type { CommunityCapabilitiesResponse, PartitionCoefficientResponse } from "../../../src/api/models";
import {
  COMMUNITY_ADMIN_CAPABILITIES,
  COMMUNITY_ADMIN_SUPPLY_CAPABILITIES,
  EMPTY_PRODUCTION,
  FIXED_COMMUNITY_ID,
  MEMBER_COMMUNITY_CAPABILITIES,
  PLATFORM_VIEW_COMMUNITY_CAPABILITIES,
  COMMUNITY_ADMIN_PLANT_CAPABILITIES,
  FIXED_PLANT,
  FIXED_PLANT_ID,
  MEMBER_PLANT_CAPABILITIES,
  FIXED_SUPPLY,
  FIXED_SUPPLY_2,
  FIXED_SUPPLY_OTHER_COMMUNITY,
  FIXED_MEMBERSHIPS,
  FIXED_DATADIS_CONFIG,
  FIXED_SHELLY_CONFIG,
  FIXED_SUPPLY_ID,
  FIXED_USER_2,
  MANAGED_USER_CAPABILITIES,
  UNMANAGEABLE_USER_CAPABILITIES,
  OWNER_SUPPLY_CAPABILITIES,
  PAGED_PLANTS,
  PAGED_SUPPLIES,
  PAGED_USERS,
  SECOND_IN_FORCE_AGREEMENT,
} from "./data";

// ---------------------------------------------------------------------------
// Helper: set up all API route mocks on a given page
//
// Pass the fixture that should be returned by /api/v1/users/current.
// All other responses are fixture-independent.
// ---------------------------------------------------------------------------

type CurrentUserFixture = { memberships?: Record<string, string>; isPlatformAdmin?: boolean };

// ---------------------------------------------------------------------------
// Authorization, derived rather than restated
//
// The handlers below used to answer 200 to everybody. That made the suite
// unable to catch the defect this whole epic is about -- a screen offering
// something the backend refuses -- because the backend never refused anything
// here. The response listener in ./test.ts fails a test on an unexpected
// 403/404, and this is what produces them.
//
// The decision is DERIVED from the very capability objects these handlers are
// about to serve, never written out a second time. That matters more than it
// looks: a hand-maintained table of endpoint rules would be a second source of
// truth for authorization, free to drift from the backend with nothing to catch
// it, and a mock that contradicts the payload it hands over is worse than no
// mock at all. Granting a capability in a fixture therefore opens the call that
// capability predicts, automatically.
//
// Two rules cannot be derived, because they are about which ROWS come back
// rather than whether the call is allowed, so no capability on the wire
// expresses them. They are listed in ROW_SCOPING below, each naming the backend
// policy it mirrors.
//
// What a green run proves: the UI is consistent with the capabilities it is
// served. It does NOT prove the backend enforces them -- that is what the
// backend's own policy-equivalence and endpoint-coverage tests are for.
// ---------------------------------------------------------------------------

/**
 * The capability that governs each community sub-resource, as the backend's
 * CommunityAccessGuard does. These are the only paths whose governing
 * capability is not `canRead` on the object being served, so they are the only
 * ones named here.
 *
 * Keyed to the generated response type, so a capability that is renamed or
 * never existed does not compile.
 */
const COMMUNITY_SUBRESOURCE: { pattern: RegExp; capability: keyof CommunityCapabilitiesResponse }[] = [
  { pattern: /\/communities\/[^/]+\/memberships/, capability: "canManageMemberships" },
  { pattern: /\/communities\/[^/]+\/config/, capability: "canManage" },
  { pattern: /\/communities\/[^/]+\/supplies\/datadis/, capability: "canManage" },
  { pattern: /\/communities\/[^/]+\/supplies/, capability: "canListSupplies" },
  { pattern: /\/communities\/[^/]+\/plants/, capability: "canListPlants" },
  { pattern: /\/communities\/[^/]+\/production/, capability: "canReadProduction" },
];

/**
 * 403 unless the served capability object allows it.
 *
 * Generic over that object so the capability has to be one of ITS keys: asking
 * a supply for a community's capability, or for a name that no longer exists,
 * is a compile error rather than a silent `undefined !== true` denial.
 */
function refusal<T extends object>(capabilities: T | undefined, capability: keyof T & string): boolean {
  return capabilities !== undefined && capabilities[capability] !== true;
}

async function refuse(route: Route, capability: string) {
  return route.fulfill({
    status: 403,
    contentType: "application/json",
    // The shape the real API returns, so the client's error handling runs the
    // same path it would in production.
    body: JSON.stringify({ status: 403, message: `forbidden: ${capability}` }),
  });
}


export async function mockAllApiRoutes(page: Page, currentUser: object) {
  // The app reads what it may do from the community itself, so the fixture has
  // to answer differently for a member and for an admin of the same community
  // -- otherwise every role would see the same menu. Derive it from the
  // caller's membership, the way the backend does.
  const role = (currentUser as CurrentUserFixture).memberships?.[FIXED_COMMUNITY_ID];
  // A platform admin belongs to no community, so there is no membership to read
  // and the member shape would be the wrong answer: canUpdate, canEnable,
  // canDisable and canManageMemberships are decisions a platform admin holds on
  // every community, while the operational ones stay out of reach. Without this
  // branch /communities/:communityId/edit refuses them, because the fixture --
  // not the product -- says they may not update it.
  const isPlatformAdmin = (currentUser as CurrentUserFixture).isPlatformAdmin === true;
  const activeCommunity = {
    id: FIXED_COMMUNITY_ID,
    name: "Sol Común",
    code: "SOL",
    enabled: true,
    capabilities: isPlatformAdmin
      ? PLATFORM_VIEW_COMMUNITY_CAPABILITIES
      : role === "COMMUNITY_ADMIN"
        ? COMMUNITY_ADMIN_CAPABILITIES
        : MEMBER_COMMUNITY_CAPABILITIES,
  };

  // Each supply carries its own answer, and the card reads it rather than the
  // community's -- so this has to vary by role too. The fixtures are untyped,
  // so a capability left out reads as false and silently hides a control.
  const supplyCapabilities =
    role === "COMMUNITY_ADMIN" ? COMMUNITY_ADMIN_SUPPLY_CAPABILITIES : OWNER_SUPPLY_CAPABILITIES;
  const asCaller = <T extends object>(supply: T) => ({ ...supply, capabilities: supplyCapabilities });
  const fixedSupply = asCaller(FIXED_SUPPLY);
  const fixedSupply2 = asCaller(FIXED_SUPPLY_2);
  const pagedSupplies = { ...PAGED_SUPPLIES, items: [fixedSupply, fixedSupply2] };

  // Supply list and supply detail.
  // NOTE: Playwright's glob ** matching is unreliable for patterns like
  // `**/api/v1/**/supplies**`.  Function predicates match reliably and avoid
  // accidentally catching the communities handler.
  const suppliesHandler = async (route: Route) => {
    const url = route.request().url();
    // /supplies/{id}/partition-coefficients (and its /active and /at siblings)
    // sit under the supply URL space, so without this guard they fall through
    // to the branches below and are answered with the supply object or the
    // paged supply list. Either shape crashes the consumer, which expects an
    // array -- and the failure surfaces as a blank section rather than as a
    // mock problem. Any supply id, not just FIXED_SUPPLY_ID: the coefficient
    // rows of an agreement carry their own ids. A test that needs real periods
    // registers mockSupplyPartitionCoefficientRoutes, which wins by being
    // registered later.
    if (url.includes("/partition-coefficients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (url.includes(`/supplies/${FIXED_SUPPLY_ID}`)) {
      if (url.includes("/production/") || url.includes("/consumption/")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EMPTY_PRODUCTION),
        });
      }
      // Derived: the object we are about to hand over says whether its own
      // read is allowed. GET /supplies/{id} answers 404 rather than 403 for a
      // caller outside the supply's community, so that is what is mirrored.
      if (refusal(fixedSupply.capabilities, "canRead")) {
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ status: 404, message: "not found" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixedSupply),
      });
    }
    // User-scoped supplies endpoint (e.g. GET /api/v1/users/{id}/supplies)
    // returns a raw array, not a paged envelope.
    if (url.includes("/api/v1/users/")) {
      // ROW SCOPING, not a gate -- one of the two rules that cannot be derived
      // from a served capability, because it is about which rows come back.
      // Mirrors SupplyAccessPolicy.visibleSuppliesOwnedBy (conluz#326): the
      // target's supplies in the communities the caller administers, or all of
      // them when the caller is the target. Every fixture supply belongs to
      // FIXED_COMMUNITY_ID, so an admin of it sees the target's and anyone else
      // sees none -- which is what makes the member walkthrough meaningful.
      // "The target's" is literal: a supply owned by somebody else is never in
      // the answer, so an admin asking about themselves gets only their own.
      const targetId = /\/users\/([^/]+)\/supplies/.exec(url)?.[1];
      const administers = role === "COMMUNITY_ADMIN";
      const own = targetId === (currentUser as { id?: string }).id;
      const ownedByTarget = [fixedSupply, fixedSupply2].filter((supply) => supply.user?.id === targetId);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(administers || own ? ownedByTarget : []),
      });
    }
    if (
      route.request().method() === "GET" &&
      !url.includes("/import") &&
      !url.includes("/datadis") &&
      !url.includes("/partitions")
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(pagedSupplies),
      });
    }
    return route.continue();
  };

  await page.route(
    (url) => url.href.includes("/api/v1/") && url.href.includes("/supplies"),
    suppliesHandler,
  );

  const otherUser = {
    ...FIXED_USER_2,
    capabilities: (currentUser as CurrentUserFixture).isPlatformAdmin
      ? MANAGED_USER_CAPABILITIES
      : UNMANAGEABLE_USER_CAPABILITIES,
  };

  // User list and current user.
  await page.route(
    (url) => url.href.includes("/api/v1/users"),
    async (route: Route) => {
      const url = route.request().url();
      // User-scoped supplies (e.g. /api/v1/users/{id}/supplies) is owned by
      // suppliesHandler. Playwright matches routes in reverse registration order,
      // so this handler is consulted first for that URL; defer to suppliesHandler
      // so it returns the raw supply array instead of the paged-users envelope.
      if (url.includes("/supplies")) {
        return route.fallback();
      }
      // GET /users/current -- the caller themselves.
      if (url.match(/\/api\/v1\/users\/current$/)) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(currentUser),
        });
      }
      // GET /users/{uuid} -- somebody else. This used to answer with the caller's
      // own record whatever id was asked for, which was harmless while nothing
      // read the response's capabilities. It is not any more: /users/:userId/edit
      // gates on that account's canEdit, and one's own record reports canEdit
      // false by design, so serving it here would send a platform admin home
      // from every user they tried to edit.
      //
      // And it carries what THIS caller may do with it, exactly as the supply and
      // plant fixtures do. UserAccessPolicy.canEdit allows a platform admin, or a
      // community admin of one of the target's communities; FIXED_USER_2 belongs
      // to none, so nobody else gets it. One fixed answer here would let every
      // caller through that guard.
      if (url.match(/\/api\/v1\/users\/[a-z0-9-]+$/)) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(otherUser),
        });
      }
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PAGED_USERS),
        });
      }
      return route.continue();
    },
  );

  // Communities: the list, and a single community by id. The id form matters
  // because the permissions layer reads the active community's capabilities
  // from GET /communities/{communityId} -- served the list, it would hand an
  // array to a caller expecting one community and every capability would read
  // as denied.
  await page.route(
    (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
    (route: Route) => {
      const path = new URL(route.request().url()).pathname;
      const byId = path.match(/\/api\/v1\/communities\/[^/]+$/);

      // Sub-resources first: the governing capability is not canRead, and the
      // community object being served carries the answer.
      const sub = COMMUNITY_SUBRESOURCE.find((rule) => rule.pattern.test(path));
      if (sub && refusal(activeCommunity.capabilities, sub.capability)) {
        return refuse(route, sub.capability);
      }
      if (byId && refusal(activeCommunity.capabilities, "canRead")) {
        return refuse(route, "canRead");
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(byId ? activeCommunity : [activeCommunity]),
      });
    },
  );

  // Plants — return empty to avoid loading spinners
  await page.route(
    (url) => url.href.includes("/api/v1/plants"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], size: 10, totalElements: 0, totalPages: 0, number: 0 }),
      }),
  );

  await page.route(
    (url) => url.href.includes("/api/v1/sharing-agreements"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
  );

  await page.route(
    (url) => url.href.includes("/api/v1/info"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ version: "1.0.0-test" }),
      }),
  );
}

// ---------------------------------------------------------------------------
// Helper: override the plants/sharing-agreements routes for a specific plant.
// Registered AFTER mockAllApiRoutes() so it takes precedence (Playwright
// matches routes in reverse registration order) — mockAllApiRoutes's broad
// communities/plants mocks would otherwise return an empty list for these
// exact URLs.
// ---------------------------------------------------------------------------

/**
 * A plant carries its own answer, and the card and the detail header read it
 * rather than the community's -- so it has to vary by role too, exactly as the
 * supply fixtures do. The fixtures are untyped, so a capability left out reads
 * as false and silently empties a screen.
 */
function asPlantCaller<T extends object>(plant: T, currentUser?: { memberships?: Record<string, string> }) {
  const role = currentUser?.memberships?.[FIXED_COMMUNITY_ID];
  return {
    ...plant,
    capabilities: role === "COMMUNITY_MEMBER" ? MEMBER_PLANT_CAPABILITIES : COMMUNITY_ADMIN_PLANT_CAPABILITIES,
  };
}

export async function mockSharingAgreementsPlantRoutes(
  page: Page,
  agreements: unknown[],
  currentUser?: { memberships?: Record<string, string> },
) {
  const plant = asPlantCaller(FIXED_PLANT, currentUser);
  await page.route(
    (url) => url.href.includes(`/api/v1/communities/${FIXED_COMMUNITY_ID}/plants`),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...PAGED_PLANTS, items: [plant] }),
      }),
  );

  await page.route(
    (url) =>
      url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}`) &&
      !url.href.includes("sharing-agreements") &&
      !url.href.includes("/partition-coefficients"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(plant),
      }),
  );

  // Nothing in force elsewhere in the plant by default, so a DRAFT lists no
  // outgoing supplies. mockInForceComparisonRoutes overrides it.
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/partition-coefficients/active`),
    (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );

  // The list, and the by-id GET of any agreement it holds or of the second
  // in-force agreement: a DRAFT reads the agreements its in-force coefficients
  // come from, for their installed power. Sub-resources of the viewed
  // agreement are served by mockSharingAgreementDetailRoutes, registered later.
  const byId = new Map(
    [...(agreements as { id: string }[]), SECOND_IN_FORCE_AGREEMENT].map((agreement) => [agreement.id, agreement]),
  );
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/sharing-agreements`),
    (route: Route) => {
      const id = new URL(route.request().url()).pathname.match(/\/sharing-agreements\/([^/]+)$/)?.[1];
      if (id === undefined) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(agreements) });
      }
      const agreement = byId.get(id);
      return agreement
        ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(agreement) })
        : route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({}) });
    },
  );
}

// ---------------------------------------------------------------------------
// Helper: the plant's active coefficients, which a DRAFT is compared against.
// Registered AFTER mockSharingAgreementsPlantRoutes() so it wins over that
// helper's empty default.
// ---------------------------------------------------------------------------

export async function mockInForceComparisonRoutes(page: Page, activeCoefficients: unknown[]) {
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/partition-coefficients/active`),
    (route: Route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(activeCoefficients) }),
  );
}

// ---------------------------------------------------------------------------
// Helper: the plant detail page's own plant. Registered AFTER mockAllApiRoutes()
// so it wins over that file's broad, deliberately-empty /plants mock.
// ---------------------------------------------------------------------------

export async function mockPlantDetailRoutes(page: Page, currentUser?: { memberships?: Record<string, string> }) {
  const plant = asPlantCaller(FIXED_PLANT, currentUser);
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}`) && !url.href.includes("sharing-agreements"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(plant),
      }),
  );
}

/**
 * Serves the supply coefficient history, honouring the optional plantId filter
 * exactly as the backend does -- the drawer passes it and must come back with a
 * single plant's timeline, the supply detail page omits it and gets both.
 *
 * Registered AFTER mockAllApiRoutes() so it wins: Playwright matches routes in
 * reverse registration order.
 */
export async function mockSupplyPartitionCoefficientRoutes(
  page: Page,
  periods: PartitionCoefficientResponse[],
  currentUser?: { memberships?: Record<string, string> },
) {
  // Each period says whether its own sharing agreement may be opened, and the
  // screens read that rather than a role. Stamped per caller here, the way
  // asCaller and asPlantCaller already do for supplies and plants, so the admin
  // and owner baselines differ because the backend's answer differs -- not
  // because two hand-written fixtures happen to disagree.
  //
  // Mirrors the capability's own contract: it predicts
  // GET /plants/{plantId}/sharing-agreements/{id}, which a community admin may
  // call and an owner who is not one may not.
  const canReadSharingAgreement = currentUser?.memberships?.[FIXED_COMMUNITY_ID] === "COMMUNITY_ADMIN";
  const asCoefficientCaller = (period: PartitionCoefficientResponse): PartitionCoefficientResponse => ({
    ...period,
    capabilities: { ...period.capabilities, canReadSharingAgreement },
  });

  await page.route(
    (url) => /\/api\/v1\/supplies\/[^/]+\/partition-coefficients/.test(url.href),
    (route: Route) => {
      const plantId = new URL(route.request().url()).searchParams.get("plantId");
      const visible = plantId ? periods.filter((period) => period.plant.id === plantId) : periods;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(visible.map(asCoefficientCaller)),
      });
    },
  );
}

// ---------------------------------------------------------------------------
// Helper: override the single-agreement, partition-coefficients and file
// routes for one agreement. Registered AFTER mockSharingAgreementsPlantRoutes()
// so its more specific predicates win (Playwright matches routes in reverse
// registration order) — the broad `/plants/{id}/sharing-agreements` route
// registered there would otherwise return the plain list for these URLs too.
// ---------------------------------------------------------------------------

// `fileStatus` controls only the response to a Descargar click (GET .../file)
// — the file panel's displayed state (filename/date vs. empty-state copy)
// comes from `agreement.file` itself, read directly off the `agreement`
// fixture passed in above, never from probing this route.
export async function mockSharingAgreementDetailRoutes(
  page: Page,
  agreementId: string,
  agreement: unknown,
  coefficients: unknown[],
  fileStatus: 200 | 404 = 404,
) {
  await page.route(
    (url) =>
      url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/sharing-agreements/${agreementId}`) &&
      !url.href.includes("/partition-coefficients") &&
      !url.href.includes("/file"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(agreement),
      }),
  );

  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/sharing-agreements/${agreementId}/partition-coefficients`),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(coefficients),
      }),
  );

  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/sharing-agreements/${agreementId}/file`),
    (route: Route) =>
      fileStatus === 404
        ? route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({}) })
        : route.fulfill({ status: 200, contentType: "application/octet-stream", body: "fake-file-bytes" }),
  );
}

// ---------------------------------------------------------------------------
// Helper: override the file route's POST with a 400 rejection carrying both a
// file-level and a line-level error. Registered AFTER
// mockSharingAgreementDetailRoutes() so it wins for POST while GET still
// falls through (via route.fallback()) to that helper's 404/200 GET mock.
// ---------------------------------------------------------------------------

export async function mockSharingAgreementFileUploadRejection(page: Page, plantId: string, agreementId: string) {
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${plantId}/sharing-agreements/${agreementId}/file`),
    (route: Route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          errors: [
            { message: "Coefficient sum invalid", code: "DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID" },
            {
              message: "Unknown CUPS",
              code: "DISTRIBUTOR_FILE_CUPS_UNKNOWN",
              params: { line: "3", cups: "ES0031300000000099ZZ" },
            },
          ],
        }),
      });
    },
  );
}

// ---------------------------------------------------------------------------
// Helper: mock the generate-file POST as a successful binary download.
// Registered AFTER mockSharingAgreementDetailRoutes() for the same
// GET-falls-through-via-route.fallback() reason as the upload-rejection helper.
// ---------------------------------------------------------------------------

export async function mockSharingAgreementGenerateFile(page: Page, plantId: string, agreementId: string) {
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${plantId}/sharing-agreements/${agreementId}/generate-file`),
    (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/octet-stream", body: "fake-generated-file-bytes" }),
  );
}

/**
 * Makes the user-scoped supplies listing answer with two communities' rows, as
 * it does for a caller who administers both.
 *
 * Registered AFTER mockAllApiRoutes so it wins. Exists for the cross-community
 * assertions: the screen must narrow this to the community in the selector,
 * because every row here is one the caller may read and none of it is a leak --
 * it is simply not all about the community on screen.
 */
export async function mockUserSuppliesAcrossCommunities(page: Page) {
  await page.route(
    (url) => /\/api\/v1\/users\/[^/]+\/supplies/.test(url.href),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { ...FIXED_SUPPLY, capabilities: COMMUNITY_ADMIN_SUPPLY_CAPABILITIES },
          { ...FIXED_SUPPLY_OTHER_COMMUNITY, capabilities: COMMUNITY_ADMIN_SUPPLY_CAPABILITIES },
        ]),
      }),
  );
}

/**
 * The community-management screens: the member roster and the integration
 * configs.
 *
 * Registered AFTER mockAllApiRoutes so these win. Without them the broad
 * communities predicate answers both with a list of communities -- the wrong
 * shape, which renders as an empty roster and as cards stuck loading.
 */
export async function mockCommunityManagementRoutes(page: Page) {
  await page.route(
    (url) => /\/api\/v1\/communities\/[^/]+\/memberships(\?|$)/.test(url.href),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXED_MEMBERSHIPS),
      }),
  );

  await page.route(
    (url) => url.href.includes("/config/datadis"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXED_DATADIS_CONFIG),
      }),
  );

  await page.route(
    (url) => url.href.includes("/config/shelly"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXED_SHELLY_CONFIG),
      }),
  );
}
