/**
 * Visual regression baseline tests — multi-role safety net
 *
 * Auth approach (no live backend required):
 *   A fake JWT string is injected into localStorage via page.addInitScript() before
 *   each page load. AuthProvider bootstraps with initialState={getFromStorage("token")}
 *   (src/utils/getFromStorage.tsx), so the app starts in an authenticated state
 *   without ever calling the login API.
 *
 * API mocking:
 *   All /api/v1/** requests are intercepted by page.route() and return fixed,
 *   deterministic JSON fixtures defined in this file. Faker-based random data is
 *   deliberately avoided — every field is a hard-coded constant so screenshots
 *   are byte-stable across runs.
 *
 * Determinism measures:
 *   - Animations/transitions are killed by an injected <style> tag after load.
 *   - document.fonts.ready is awaited before capture to prevent mid-render font flashes.
 *   - All API responses include no time-varying fields (no "createdAt", etc.).
 *   - reducedMotion: "reduce" is set at the project level in playwright.config.ts.
 *
 * Role fixture mapping:
 *   FIXED_MEMBER_USER          → home, supply-points, supply-detail, supply modals
 *   FIXED_COMMUNITY_ADMIN_USER → sharing-agreements list (populated/empty/filtered). /members
 *                                itself is still not Playwright-tested via direct navigation
 *                                because CommunityAdminRoute defers community selection to a
 *                                useEffect that fires after the first render, causing a redirect
 *                                to / before the guard re-evaluates on a cold page.goto(). The
 *                                sharing-agreements tests below route around the same limitation
 *                                by navigating from an unguarded page (/production) and clicking
 *                                through via the app's own Link — by the time that client-side
 *                                navigation happens, the community-resolution effect has already
 *                                settled, so the guard passes. /members itself is still covered by
 *                                unit tests only (ImportPartnersModal.spec.tsx, etc.).
 *   FIXED_PLATFORM_ADMIN_USER  → /platform (platform dashboard: populated + empty), /users (users page)
 *   FIXED_NO_COMMUNITY_USER    → /no-community (asserts the screen renders correctly)
 *
 * Partners page migration:
 *   /partners has been removed from the route table (Phase 5.1/5.2). The "partners page"
 *   test has been migrated to "users page" (/users, PlatformAdminRoute). The "import
 *   partners modal" test has been removed: ImportPartnersModal now lives in MembersPage
 *   (/members, CommunityAdminRoute). The CommunityAdminRoute timing issue described above
 *   makes reliable direct Playwright navigation to /members impossible without app-level
 *   changes. The modal itself is unit-tested in ImportPartnersModal.spec.tsx.
 */

import { test, expect, type Page, type Route, type TestInfo } from "@playwright/test";

// ---------------------------------------------------------------------------
// Fixed fixtures — these values NEVER change between runs
// ---------------------------------------------------------------------------

const FIXED_TOKEN = "test-jwt-token-for-visual-regression";

const FIXED_SUPPLY_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

/** Stable community UUID used in all member/community-admin fixtures. */
const FIXED_COMMUNITY_ID = "cccccccc-dddd-eeee-ffff-000000000001";

/**
 * Member fixture — belongs to FIXED_COMMUNITY_ID as COMMUNITY_MEMBER.
 * Use for: home, supply-points, supply-detail, supply modal tests.
 */
const FIXED_MEMBER_USER = {
  id: "11111111-2222-3333-4444-555555555555",
  personalId: "12345678A",
  number: 1,
  fullName: "María García López",
  address: "Calle Mayor, 1",
  email: "admin@conluz.test",
  phoneNumber: "600000001",
  enabled: true,
  role: "ADMIN",
  isPlatformAdmin: false,
  memberships: { [FIXED_COMMUNITY_ID]: "COMMUNITY_MEMBER" },
};

/**
 * Community-admin fixture — belongs to FIXED_COMMUNITY_ID as COMMUNITY_ADMIN.
 * Use for: sharing-agreements list tests (populated/empty/filtered) — see file header.
 */
const FIXED_COMMUNITY_ADMIN_USER = {
  id: "55555555-6666-7777-8888-999999999999",
  personalId: "87654321B",
  number: 2,
  fullName: "Pedro Sánchez Ruiz",
  address: "Avenida del Parque, 42",
  email: "pedro@conluz.test",
  phoneNumber: "600000002",
  enabled: true,
  role: "ADMIN",
  isPlatformAdmin: false,
  memberships: { [FIXED_COMMUNITY_ID]: "COMMUNITY_ADMIN" },
};

/**
 * Platform-admin fixture — no community memberships, isPlatformAdmin=true.
 * Use for: /platform (platform welcome), /users (users page).
 */
const FIXED_PLATFORM_ADMIN_USER = {
  id: "33333333-4444-5555-6666-777777777777",
  personalId: "11111111C",
  number: 3,
  fullName: "María García López",
  address: "Calle Mayor, 1",
  email: "platform@conluz.test",
  phoneNumber: "600000003",
  enabled: true,
  role: "ADMIN",
  isPlatformAdmin: true,
  memberships: {},
};

/**
 * No-community fixture — not a platform admin and no memberships.
 * resolveLandingRoute sends this user to /no-community.
 * Use for: /no-community screen.
 */
const FIXED_NO_COMMUNITY_USER = {
  id: "44444444-5555-6666-7777-888888888888",
  personalId: "22222222D",
  number: 4,
  fullName: "Ana Martínez García",
  address: "Calle Secundaria, 2",
  email: "nocommunity@conluz.test",
  phoneNumber: "600000004",
  enabled: true,
  role: "PARTNER",
  isPlatformAdmin: false,
  memberships: {},
};

/** Secondary user shown in list responses — not the logged-in user. */
const FIXED_USER_2 = {
  id: "22222222-3333-4444-5555-666666666666",
  personalId: "87654321B",
  number: 2,
  fullName: "Pedro Sánchez Ruiz",
  address: "Avenida del Parque, 42",
  email: "pedro@conluz.test",
  phoneNumber: "600000002",
  enabled: true,
  role: "PARTNER",
  isPlatformAdmin: false,
  memberships: {},
};

const FIXED_SUPPLY = {
  id: FIXED_SUPPLY_ID,
  code: "ES0021000000000000AA",
  name: "Casa Principal",
  address: "Calle Mayor, 1, 28001 Madrid",
  addressRef: "ESC D PTA 1",
  partitionCoefficient: 0.1234,
  enabled: true,
  datadisValidDateFrom: "2024-01-01",
  datadisDistributor: "Iberdrola",
  datadisDistributorCode: "2",
  datadisPointType: 5,
  datadisIsThirdParty: false,
  user: FIXED_MEMBER_USER,
};

const FIXED_SUPPLY_2 = {
  id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
  code: "ES0021000000000000BB",
  name: "Garaje",
  address: "Calle Mayor, 1, Sótano, 28001 Madrid",
  addressRef: "",
  partitionCoefficient: 0.0566,
  enabled: false,
  datadisValidDateFrom: "2024-03-15",
  datadisDistributor: "Endesa",
  datadisDistributorCode: "1",
  datadisPointType: 3,
  datadisIsThirdParty: false,
  user: FIXED_MEMBER_USER,
};

const PAGED_SUPPLIES = {
  items: [FIXED_SUPPLY, FIXED_SUPPLY_2],
  size: 10000,
  totalElements: 2,
  totalPages: 1,
  number: 0,
};

const PAGED_USERS = {
  // Include a platform admin so the Users page baseline exercises both the
  // platform-admin indicator (FIXED_PLATFORM_ADMIN_USER) and a plain row (FIXED_USER_2).
  items: [FIXED_PLATFORM_ADMIN_USER, FIXED_USER_2],
  size: 10,
  totalElements: 2,
  totalPages: 1,
  number: 0,
};

/**
 * Rich community fixtures for the platform dashboard baseline. Deterministic
 * values chosen to cover every derived signal:
 *   - Activa (enabled, members, admins): Luco de Jiloca, Barrio del Sol
 *   - Sin admin (no adminNames):          Vega Baja
 *   - Sin usuarios (memberCount 0):        Monte Alto
 *   - Deshabilitada (enabled false):       Río Verde
 */
const DASHBOARD_COMMUNITIES = [
  { id: "c1", name: "Luco de Jiloca", code: "LDJ", enabled: true, adminNames: ["Ana Gil"], memberCount: 38, supplyPointCount: 42 },
  { id: "c2", name: "Barrio del Sol", code: "BDS", enabled: true, adminNames: ["Luis Mora"], memberCount: 21, supplyPointCount: 24 },
  { id: "c3", name: "Vega Baja", code: "VGB", enabled: true, adminNames: [], memberCount: 12, supplyPointCount: 8 },
  { id: "c4", name: "Monte Alto", code: "MTA", enabled: true, adminNames: ["Sara Ruiz"], memberCount: 0, supplyPointCount: 3 },
  { id: "c5", name: "Río Verde", code: "RVD", enabled: false, adminNames: ["Paco Díaz"], memberCount: 5, supplyPointCount: 2 },
];

const EMPTY_PRODUCTION: unknown[] = [];

/** Stable plant UUID used by the sharing-agreements baselines. */
const FIXED_PLANT_ID = "dddddddd-eeee-ffff-0000-111111111111";
// A second plant the same supply also participates in. Only the coefficient
// history needs it, so it has no PlantResponse fixture of its own.
const SECOND_PLANT_ID = "dddddddd-eeee-ffff-0000-222222222222";

const FIXED_PLANT = {
  id: FIXED_PLANT_ID,
  providerCode: "HWI-001",
  regulatoryCode: "ES1234567890123456AB1F",
  name: "Planta Solar Norte",
  address: "Polígono Industrial Norte, Nave 3",
  description: "Instalación fotovoltaica comunitaria",
  inverterProvider: "HUAWEI",
  totalPower: 120.5,
  connectionDate: "2023-05-10",
};

/**
 * The plant fixture plus a linked supply. Kept separate from FIXED_PLANT so the
 * sharing-agreement baselines, which share that fixture, stay byte-identical.
 * The detail header needs it: without a linked supply it would have four
 * details rather than five, and the "+5" toggle is part of what AC1 specifies.
 */
const FIXED_PLANT_WITH_SUPPLY = {
  ...FIXED_PLANT,
  supply: {
    id: FIXED_SUPPLY_ID,
    code: "ES0031300806333002ET0F",
    name: "Casa de Luco",
  },
};

const PAGED_PLANTS = {
  items: [FIXED_PLANT],
  size: 10000,
  totalElements: 1,
  totalPages: 1,
  number: 0,
};

/**
 * Three agreements, one per status, so the populated baseline exercises every chip/badge colour.
 *
 * `file`: the DRAFT agreement carries a populated file on purpose — a draft
 * whose coefficients started from an imported TXT is the common case (every
 * agreement whose reparto came from outside Conluz), not an edge case, so the
 * canonical draft baselines below show file-panel state B (with its
 * subordinate Generar/Importar actions), not state A. State A (no file yet)
 * gets its own dedicated fixture and baseline (NO_FILE_DRAFT_AGREEMENT).
 */
const FIXED_SHARING_AGREEMENTS = [
  {
    id: "eeeeeeee-ffff-0000-1111-222222222222",
    plantId: FIXED_PLANT_ID,
    name: "Reparto vecinos bloque A",
    notes: "Coeficientes acordados en la asamblea anual de la comunidad.",
    status: "PUBLISHED",
    installedPowerKw: 120.5,
    createdAt: "2024-06-15T10:00:00Z",
    createdBy: FIXED_COMMUNITY_ADMIN_USER.id,
    file: { id: "file-published", filename: "ES1234567890123456AB1F_2024.txt", uploadedAt: "2024-06-20T09:15:00Z" },
  },
  {
    id: "ffffffff-0000-1111-2222-333333333333",
    plantId: FIXED_PLANT_ID,
    name: "Reparto ampliación bloque B",
    notes: "Pendiente de revisión antes de publicarse.",
    status: "DRAFT",
    installedPowerKw: 45,
    createdAt: "2024-09-01T09:30:00Z",
    createdBy: FIXED_COMMUNITY_ADMIN_USER.id,
    file: { id: "file-draft", filename: "ES1234567890123456AB1F_2025.txt", uploadedAt: "2025-01-10T08:00:00Z" },
  },
  {
    id: "00000000-1111-2222-3333-444444444444",
    plantId: FIXED_PLANT_ID,
    name: "Reparto original 2022",
    notes: "Sustituido por el acuerdo vigente tras la ampliación de potencia.",
    status: "SUPERSEDED",
    installedPowerKw: 80,
    createdAt: "2022-02-01T08:00:00Z",
    createdBy: null,
    file: null,
  },
];

/** State A (no file, DRAFT) needs its own fixture, since the canonical DRAFT_AGREEMENT above now has a file. */
const NO_FILE_DRAFT_AGREEMENT = { ...FIXED_SHARING_AGREEMENTS[1], file: null };

/**
 * Coefficient set covering every case the detail-page baselines must exercise:
 *   - PENDING with no validFrom (row 2) and APPLIED with validFrom (rows 1,3,4,5,6)
 *   - all 5 endState values: OPEN (1,2), OPEN_ORPHAN (3), PENDING_SUCCESSION (4), DERIVED (5), CLOSED (6)
 *   - a coefficient: 0 row (row 6) — meaningful (a supply that left distribution), never hidden
 *   - fileSum = 1.00 (100%); appliedSum = 0.75 (75%, below 100% — exercises the informational card)
 *
 * Also doubles as the DRAFT defensive-fallback fixture: paired with
 * DRAFT_AGREEMENT it represents a state the backend guarantees can't occur
 * (APPLIED requires publishing first; revert-to-draft is refused once
 * anything is applied), used only to prove the frontend doesn't silently
 * drop unexpected data if that guarantee is ever violated. Don't "clean up"
 * this fixture into an all-PENDING set — see FIXED_COEFFICIENTS_ALL_PENDING
 * below for what a real DRAFT looks like.
 */
const FIXED_COEFFICIENTS_MIXED = [
  {
    coefficientId: "coef-1",
    supply: { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AA" },
    coefficient: 0.3,
    applicationState: "APPLIED",
    validFrom: "2024-01-01T00:00:00Z",
    endState: "OPEN",
    currentCoefficient: { coefficient: 0.25, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-2",
    supply: { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" },
    coefficient: 0.25,
    applicationState: "PENDING",
    endState: "OPEN",
    currentCoefficient: null,
  },
  {
    coefficientId: "coef-3",
    supply: { id: "supply-3", name: "Local C", code: "ES0031300000000003CC" },
    coefficient: 0.2,
    applicationState: "APPLIED",
    validFrom: "2024-02-01T00:00:00Z",
    endState: "OPEN_ORPHAN",
    currentCoefficient: { coefficient: 0.2, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-4",
    supply: { id: "supply-4", name: "Nave D", code: "ES0031300000000004DD" },
    coefficient: 0.15,
    applicationState: "APPLIED",
    validFrom: "2023-01-01T00:00:00Z",
    endState: "PENDING_SUCCESSION",
    currentCoefficient: { coefficient: 0.15, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-5",
    supply: { id: "supply-5", name: "Trastero E", code: "ES0031300000000005EE" },
    coefficient: 0.1,
    applicationState: "APPLIED",
    validFrom: "2022-01-01T00:00:00Z",
    endState: "DERIVED",
    endDate: "2023-12-31T00:00:00Z",
    currentCoefficient: { coefficient: 0.1, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-6",
    supply: { id: "supply-6", name: "Ático F", code: "ES0031300000000006FF" },
    coefficient: 0,
    applicationState: "APPLIED",
    validFrom: "2024-03-01T00:00:00Z",
    endState: "CLOSED",
    endDate: "2024-05-01T00:00:00Z",
    currentCoefficient: { coefficient: 0, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
];

/**
 * What a real DRAFT looks like: the backend guarantees every coefficient is
 * PENDING/OPEN until the agreement is published, so this is the canonical
 * fixture for the DRAFT detail baseline — no state columns, no filter chips.
 */
const FIXED_COEFFICIENTS_ALL_PENDING = [
  {
    coefficientId: "coef-1",
    supply: { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AA" },
    coefficient: 0.4,
    applicationState: "PENDING",
    endState: "OPEN",
    // Raised by this draft: 0.35 -> 0.40.
    currentCoefficient: { coefficient: 0.35, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-2",
    supply: { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" },
    coefficient: 0.35,
    applicationState: "PENDING",
    endState: "OPEN",
    // Lowered by this draft: 0.40 -> 0.35, so one baseline shows both signs.
    currentCoefficient: { coefficient: 0.4, validFrom: "2023-01-01T00:00:00Z", sharingAgreement: { id: "sa-0", name: "Reparto 2023", status: "SUPERSEDED" } },
  },
  {
    coefficientId: "coef-3",
    supply: { id: "supply-3", name: "Local C", code: "ES0031300000000003CC" },
    coefficient: 0.25,
    applicationState: "PENDING",
    endState: "OPEN",
    // Genuinely on nothing yet — the "—" branch of AC8, in the same baseline.
    currentCoefficient: null,
  },
];

const FIXED_COEFFICIENTS_EMPTY: unknown[] = [];

/**
 * A DRAFT set that genuinely doesn't sum to 100% (0.4 + 0.35 = 0.75), for the
 * publish-not-offered baseline — distinct from FIXED_COEFFICIENTS_ALL_PENDING,
 * which sums to exactly 1.
 */
const FIXED_COEFFICIENTS_INCOMPLETE = [
  {
    coefficientId: "coef-1",
    supply: { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AA" },
    coefficient: 0.4,
    applicationState: "PENDING",
    endState: "OPEN",
  },
  {
    coefficientId: "coef-2",
    supply: { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" },
    coefficient: 0.35,
    applicationState: "PENDING",
    endState: "OPEN",
  },
];

// ---------------------------------------------------------------------------
// Helper: set up all API route mocks on a given page
//
// Pass the fixture that should be returned by /api/v1/users/current.
// All other responses are fixture-independent.
// ---------------------------------------------------------------------------

async function mockAllApiRoutes(page: Page, currentUser: object) {
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
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXED_SUPPLY),
      });
    }
    // User-scoped supplies endpoint (e.g. GET /api/v1/users/{id}/supplies)
    // returns a raw array, not a paged envelope.
    if (url.includes("/api/v1/users/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([FIXED_SUPPLY, FIXED_SUPPLY_2]),
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
        body: JSON.stringify(PAGED_SUPPLIES),
      });
    }
    return route.continue();
  };

  await page.route(
    (url) => url.href.includes("/api/v1/") && url.href.includes("/supplies"),
    suppliesHandler,
  );

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
      // Matches /users/current and /users/{uuid}
      if (url.match(/\/api\/v1\/users\/[a-z0-9-]+$/)) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(currentUser),
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

  // Communities (list only — exclude supplies URLs)
  await page.route(
    (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: FIXED_COMMUNITY_ID, name: "Sol Común", code: "SOL", enabled: true },
        ]),
      }),
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

async function mockSharingAgreementsPlantRoutes(page: Page, agreements: unknown[]) {
  await page.route(
    (url) => url.href.includes(`/api/v1/communities/${FIXED_COMMUNITY_ID}/plants`),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PAGED_PLANTS),
      }),
  );

  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}`) && !url.href.includes("sharing-agreements"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXED_PLANT),
      }),
  );

  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/sharing-agreements`),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(agreements),
      }),
  );
}

// ---------------------------------------------------------------------------
// Helper: the plant detail page's own plant. Registered AFTER mockAllApiRoutes()
// so it wins over that file's broad, deliberately-empty /plants mock.
// ---------------------------------------------------------------------------

async function mockPlantDetailRoutes(page: Page) {
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}`) && !url.href.includes("sharing-agreements"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXED_PLANT_WITH_SUPPLY),
      }),
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
/**
 * A supply genuinely participating in two plants, which is the whole point of
 * the multi-plant contract -- a single-plant fixture validates no grouping at
 * all. Carries a pending period (validFrom: null) too, so the client-side
 * filter that hides it from an admin is exercised rather than assumed.
 *
 * Deliberately NOT ordered newest-first here: the endpoint returns validFrom
 * ascending, and the component is what reverses it.
 */
// The supply the agreement coefficient fixtures use for "Vivienda A". Distinct
// from FIXED_SUPPLY_ID, which identifies the standalone supply-detail fixture.
const HISTORY_SUPPLY_ID = "supply-1";

const FIXED_SUPPLY_COEFFICIENT_HISTORY = [
  {
    id: "hist-1",
    supply: { id: HISTORY_SUPPLY_ID, code: "ES0031300000000001AA", name: "Vivienda A" },
    community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
    plant: { id: FIXED_PLANT_ID, name: "Planta Solar Norte" },
    sharingAgreement: { id: FIXED_SHARING_AGREEMENTS[2].id, name: "Reparto original 2022", status: "SUPERSEDED" },
    coefficient: 0.1,
    validFrom: "2022-03-01T00:00:00Z",
    validTo: "2023-01-01T00:00:00Z",
    createdAt: "2022-02-01T08:00:00Z",
  },
  {
    id: "hist-2",
    supply: { id: HISTORY_SUPPLY_ID, code: "ES0031300000000001AA", name: "Vivienda A" },
    community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
    plant: { id: FIXED_PLANT_ID, name: "Planta Solar Norte" },
    sharingAgreement: { id: FIXED_SHARING_AGREEMENTS[0].id, name: "Reparto vecinos bloque A", status: "PUBLISHED" },
    coefficient: 0.25,
    validFrom: "2023-01-01T00:00:00Z",
    validTo: null,
    createdAt: "2024-06-15T10:00:00Z",
  },
  {
    id: "hist-3",
    supply: { id: HISTORY_SUPPLY_ID, code: "ES0031300000000001AA", name: "Vivienda A" },
    community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
    plant: { id: SECOND_PLANT_ID, name: "Planta Solar Sur" },
    sharingAgreement: { id: "sa-sur", name: "Reparto Sur 2024", status: "PUBLISHED" },
    coefficient: 0.4,
    validFrom: "2024-04-01T00:00:00Z",
    validTo: null,
    createdAt: "2024-03-01T10:00:00Z",
  },
  {
    id: "hist-pending",
    supply: { id: HISTORY_SUPPLY_ID, code: "ES0031300000000001AA", name: "Vivienda A" },
    community: { id: FIXED_COMMUNITY_ID, name: "Sol Común" },
    plant: { id: FIXED_PLANT_ID, name: "Planta Solar Norte" },
    sharingAgreement: { id: FIXED_SHARING_AGREEMENTS[1].id, name: "Reparto ampliación bloque B", status: "DRAFT" },
    coefficient: 0.3,
    validFrom: null,
    validTo: null,
    createdAt: "2024-09-01T09:30:00Z",
  },
];

/**
 * Serves the supply coefficient history, honouring the optional plantId filter
 * exactly as the backend does -- the drawer passes it and must come back with a
 * single plant's timeline, the supply detail page omits it and gets both.
 *
 * Registered AFTER mockAllApiRoutes() so it wins: Playwright matches routes in
 * reverse registration order.
 */
async function mockSupplyPartitionCoefficientRoutes(page: Page, periods: unknown[]) {
  await page.route(
    (url) => /\/api\/v1\/supplies\/[^/]+\/partition-coefficients/.test(url.href),
    (route: Route) => {
      const plantId = new URL(route.request().url()).searchParams.get("plantId");
      const body = plantId
        ? (periods as { plant: { id: string } }[]).filter((period) => period.plant.id === plantId)
        : periods;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    },
  );
}

async function mockSharingAgreementDetailRoutes(
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

async function mockSharingAgreementFileUploadRejection(page: Page, plantId: string, agreementId: string) {
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

async function mockSharingAgreementGenerateFile(page: Page, plantId: string, agreementId: string) {
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${plantId}/sharing-agreements/${agreementId}/generate-file`),
    (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/octet-stream", body: "fake-generated-file-bytes" }),
  );
}

// ---------------------------------------------------------------------------
// Helper: inject auth token so the app boots as authenticated
// ---------------------------------------------------------------------------

async function injectAuthToken(page: Page) {
  await page.addInitScript((token: string) => {
    window.localStorage.setItem("token", token);
  }, FIXED_TOKEN);
}

// ---------------------------------------------------------------------------
// Helper: seed active community in localStorage so the community context
// resolves immediately for tests that navigate to community-scoped screens.
// Called in addition to injectAuthToken for member and community-admin fixtures.
// ---------------------------------------------------------------------------

async function seedActiveCommunity(page: Page, userId: string) {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value);
    },
    { key: `activeCommunity:${userId}`, value: FIXED_COMMUNITY_ID }
  );
}

// ---------------------------------------------------------------------------
// Helper: inject CSS to kill all animations, then wait for fonts + network
// ---------------------------------------------------------------------------

async function stabilizePage(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition: none !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });

  // Wait for web fonts to finish loading so text is rendered in the correct font
  await page.waitForFunction(() => document.fonts.ready);

  // Give React Query one tick to settle any pending state updates
  await page.waitForLoadState("networkidle");

  // Reset scroll to the top. A page scrolled away from (0, 0) at capture time
  // can bake a stale offset into position: fixed elements (e.g. the AppBar)
  // in a fullPage screenshot, even though the element renders correctly on screen.
  // A preceding click (e.g. a filter chip) can trigger the browser's native
  // focus scroll-into-view asynchronously; under CPU contention that can land
  // after a single reset, so re-assert once more after giving it time to fire,
  // then let the compositor settle before the screenshot is taken.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Visual baselines", () => {
  test("login page", async ({ page }) => {
    // No token injection — unauthenticated render
    await page.goto("/login");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("login-page.png", { fullPage: true });
  });

  // Member-fixture tests: home, supply-points, supply-detail, supply modals
  // Active community is seeded in localStorage so operational UI is visible
  // after the community useEffect auto-selects it.

  test("home page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("home-page.png", { fullPage: true });
  });

  test("supplies list page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supplies-list.png", { fullPage: true });
  });

  test("supply detail page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail.png", { fullPage: true });
  });

  // The coefficient history section is reachable by the owner as well as by an
  // admin: /supply-points/:id carries no community guard and the endpoint
  // authorises the supply owner. These three cover both roles and the empty
  // state, on a supply that genuinely takes part in two plants.

  test("supply detail coefficient history (admin, two plants)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail-coefficient-history-admin.png", { fullPage: true });

    // No plantId filter here, so both plants group; the draft's pending period
    // is withheld even though an admin receives it.
    await expect(page.getByRole("heading", { name: "Planta Solar Norte" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Planta Solar Sur" })).toBeVisible();
    await expect(page.getByText("Reparto ampliación bloque B")).toHaveCount(0);
    // An admin of this community can follow a link to the agreement.
    await expect(page.getByRole("link", { name: "Reparto vecinos bloque A" })).toBeVisible();
  });

  test("supply detail coefficient history (owner, no agreement links)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail-coefficient-history-owner.png", { fullPage: true });

    // Same periods, but the agreement route is CommunityAdminRoute-guarded, so
    // an owner is shown names rather than links that would redirect them.
    await expect(page.getByText("Reparto vecinos bloque A")).toBeVisible();
    await expect(page.getByRole("link", { name: "Reparto vecinos bloque A" })).toHaveCount(0);
  });

  test("supply detail coefficient history (empty)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);
    await mockSupplyPartitionCoefficientRoutes(page, []);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByText("Sin periodos aplicados")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail-coefficient-history-empty.png", { fullPage: true });
  });

  test("import supplies modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Scroll the "Importar CSV" button into view (may be off-screen on mobile) then click
    const importBtn = page.getByRole("button", { name: /importar csv/i });
    await importBtn.scrollIntoViewIfNeeded();
    await importBtn.click();

    // Wait for the modal title text to appear (MUI Modal doesn't use role="dialog")
    await page.waitForSelector("text=Importar Puntos de Suministro desde CSV");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("import-supplies-modal.png", { fullPage: true });
  });

  test("disable confirmation modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Open the three-dot menu on the enabled supply card (ES0021000000000000AA)
    const enabledCard = page
      .locator(".MuiCard-root")
      .filter({ hasText: "ES0021000000000000AA" });
    await enabledCard.getByRole("button").click();

    // Click "Deshabilitar" in the dropdown — opens DisableConfirmationModal
    await page.getByRole("menuitem", { name: /Deshabilitar/i }).click();

    await page.waitForSelector("text=Deshabilitar punto de suministro");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("disable-confirmation-modal.png", {
      fullPage: true,
    });
  });

  test("disable success modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Open the dropdown and trigger the disable confirmation modal
    const enabledCard = page
      .locator(".MuiCard-root")
      .filter({ hasText: "ES0021000000000000AA" });
    await enabledCard.getByRole("button").click();
    await page.getByRole("menuitem", { name: /Deshabilitar/i }).click();
    await page.waitForSelector("text=Deshabilitar punto de suministro");

    // Confirm — fires POST /api/v1/supplies/{id}/disable (mocked → 200)
    // then opens DisableSuccessModal
    await page.getByRole("button", { name: /^Deshabilitar$/i }).click();

    await page.waitForSelector("text=ha sido deshabilitado");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("disable-success-modal.png", {
      fullPage: true,
    });
  });

  // Platform-admin fixture tests: /platform (welcome) and /users (users management).
  // PlatformAdminRoute reads isPlatformAdmin directly from loggedUser (no async
  // community selection needed), so direct page.goto() works reliably.

  // Platform dashboard — populated. A richer communities fixture (registered
  // AFTER mockAllApiRoutes so it is consulted first) exercises every KPI, the
  // attention panel (all three signals), and all four status-chip variants.
  test("platform dashboard (populated)", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await page.route(
      (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(DASHBOARD_COMMUNITIES),
        }),
    );

    await page.goto("/platform");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("platform-dashboard-populated.png", { fullPage: true });
  });

  // Platform dashboard — empty (0 communities → first-community empty state).
  test("platform dashboard (empty)", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await page.route(
      (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        }),
    );

    await page.goto("/platform");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("platform-dashboard-empty.png", { fullPage: true });
  });

  test("users page", async ({ page }) => {
    // Migrated from "partners page" — /partners was removed in Phase 5.1/5.2.
    // The users management screen (/users) is the platform-admin equivalent.
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/users");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("users-page.png", { fullPage: true });
  });

  // No-community fixture test: asserts that a user with no memberships and
  // isPlatformAdmin=false sees the /no-community screen (the correct expected behaviour).

  test("no-community page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_NO_COMMUNITY_USER);

    // Navigate directly — NoCommunityPage has no route guard, so it always renders.
    // AuthenticatedLayout's landing-redirect only fires when pathname === '/',
    // so navigating here directly does not trigger a redirect to /no-community.
    await page.goto("/no-community");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("no-community-page.png", { fullPage: true });
  });

  // Community-admin fixture tests: sharing-agreements list.
  // CommunityAdminRoute redirects on a cold page.goto() before the community
  // context's useEffect resolves (see file header), so these tests reach the
  // guarded route the same way a real user would — navigating from the
  // unguarded /production list and clicking through the plant card's kebab
  // menu — rather than deep-linking directly.

  async function navigateToSharingAgreements(page: Page) {
    await page.goto("/production");
    await stabilizePage(page);

    const plantCard = page.locator(".MuiCard-root").filter({ hasText: FIXED_PLANT.name });
    await plantCard.getByRole("button").click();
    await page.getByRole("menuitem", { name: /Acuerdos de Reparto/i }).click();

    await expect(page.getByText(/CAU:/)).toBeVisible();
    await stabilizePage(page);
  }

  test("sharing agreements list page (populated)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

    await navigateToSharingAgreements(page);

    await expect(page).toHaveScreenshot("sharing-agreements-list.png", { fullPage: true });
  });

  test("sharing agreements list page (empty)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, []);

    await navigateToSharingAgreements(page);

    await expect(page).toHaveScreenshot("sharing-agreements-list-empty.png", { fullPage: true });
  });

  test("sharing agreements list page (status filter active)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

    await navigateToSharingAgreements(page);

    await page.getByRole("button", { name: "Borrador" }).click();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreements-list-filtered.png", { fullPage: true });
  });

  test("sharing agreement create dialog (capacity prefilled from plant totalPower)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

    await navigateToSharingAgreements(page);
    await page.getByRole("button", { name: "Nuevo acuerdo de reparto" }).click();

    await expect(page.getByLabel("Capacidad de generación de la planta", { exact: false })).toHaveValue("120,5");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-create-dialog.png", { fullPage: true });
  });

  test("sharing agreement create dialog (empty-name validation error)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

    await navigateToSharingAgreements(page);
    await page.getByRole("button", { name: "Nuevo acuerdo de reparto" }).click();
    await page.getByRole("button", { name: "Crear borrador" }).click();

    await expect(page.getByText("El nombre es obligatorio")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-create-dialog-validation-error.png", { fullPage: true });
  });

  // Community-admin fixture tests: sharing-agreement detail page.
  // Same CommunityAdminRoute cold-navigation limitation as the list page (see
  // file header) — reached by navigating through the list and clicking a
  // card's own title link, never via a cold page.goto().
  //
  // The file panel is driven entirely by `agreement.file` from the already-
  // loaded agreement response (no separate probe/fetch to learn whether a
  // file exists), so its rendered state differs per fixture below: state A
  // (no file, DRAFT — Generar/Importar primary actions), state B (file
  // present — filename/date + Descargar, plus subordinate actions in DRAFT),
  // state C (no file, sealed — explained-and-closed, no action button).

  async function navigateToSharingAgreementDetail(page: Page, agreementName: string) {
    await navigateToSharingAgreements(page);

    const agreementCard = page.locator(".MuiCard-root").filter({ hasText: agreementName });
    await agreementCard.getByRole("link", { name: agreementName }).click();

    // The file panel's title always renders on load regardless of file/coefficient
    // state, so it's a reliable "detail page finished loading" signal across every
    // fixture — unlike "Suma del fichero", which is absent when coefficients is empty.
    // One wording in every status now: the panel no longer switches to
    // "Fichero enviado a la distribuidora" once the agreement is published.
    await expect(page.getByRole("heading", { name: "Fichero para la distribuidora" })).toBeVisible();
    await stabilizePage(page);
  }

  const DRAFT_AGREEMENT = FIXED_SHARING_AGREEMENTS[1];
  const PUBLISHED_AGREEMENT = FIXED_SHARING_AGREEMENTS[0];
  const SUPERSEDED_AGREEMENT = FIXED_SHARING_AGREEMENTS[2];

  /**
   * PUBLISHED_AGREEMENT is shared by ~20 baselines below (batch bar, dialogs,
   * editor states, ...) that have nothing to do with editing. Only the
   * dedicated "published" detail-page baseline should exercise the
   * last-edited tile, so it gets its own derived fixture instead of adding
   * updatedAt/updatedBy to the shared one, which would needlessly reshoot
   * every other PUBLISHED_AGREEMENT screenshot.
   */
  const PUBLISHED_AGREEMENT_EDITED = {
    ...PUBLISHED_AGREEMENT,
    updatedAt: "2026-08-01T09:00:00Z",
    updatedBy: FIXED_COMMUNITY_ADMIN_USER.id,
  };

  /**
   * The current-coefficient readout has two shapes: a column header on the
   * desktop table, and a self-naming line on the mobile card, which has no
   * headers. Both DOM trees are always mounted and swapped by a CSS
   * breakpoint, so asserting the desktop header on mobile finds it hidden
   * rather than absent.
   */
  async function expectCurrentCoefficientShown(page: Page, testInfo: TestInfo) {
    const label = testInfo.project.name === "desktop" ? page.getByText("Coeficiente actual") : page.getByText(/^Actual /);
    await expect(label.first()).toBeVisible();
  }

  test("sharing agreement detail page (draft, with coefficients)", async ({ page }, testInfo) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_ALL_PENDING, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    // A real DRAFT is all-PENDING/OPEN, so the application/end-state columns
    // and filter chips are hidden entirely — this is what a real user sees.
    await expect(page.getByText("Estado de aplicación")).toHaveCount(0);

    // Both branches of the current-coefficient readout in one shot: two
    // supplies are already on a coefficient (one raised, one lowered by this
    // draft) and Local C is on none.
    await expectCurrentCoefficientShown(page, testInfo);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft.png", { fullPage: true });
  });

  test("sharing agreement detail page (draft, no coefficient in force yet)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    // FIXED_COEFFICIENTS_INCOMPLETE deliberately carries no currentCoefficient:
    // a community's first agreement has nothing in force to compare against.
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_INCOMPLETE, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    // The column is not mounted at all — a column of dashes would cost width
    // on a 390px viewport to say nothing.
    await expect(page.getByText("Coeficiente actual")).toHaveCount(0);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft-no-current-coefficient.png", {
      fullPage: true,
    });
  });

  test("sharing agreement detail page (draft, anomalous coefficients — defensive fallback)", async ({ page }, testInfo) => {
    // FIXED_COEFFICIENTS_MIXED represents a state the backend guarantees a
    // real DRAFT can never reach (APPLIED requires publishing first; revert-
    // to-draft is refused once anything is applied). This test exists solely
    // to prove the frontend still renders the columns rather than silently
    // dropping unexpected data if that backend guarantee is ever violated.
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    // "Estado de aplicación" itself is a desktop-table-only column header —
    // on mobile it stays mounted but CSS-hidden (the card layout shows the
    // state value without a label), so it's not a reliable visible/hidden
    // signal across both viewports. The application-state filter chips are
    // shared by both layouts and only render when showStateColumns is true,
    // so "Sin aplicar" being visible proves the same thing on either viewport.
    await expect(page.getByRole("button", { name: "Sin aplicar" })).toBeVisible();

    // Asserted rather than left to the pixels: on a tall desktop fullPage shot
    // a whole extra column diffs below maxDiffPixelRatio (0.02), so this
    // baseline passed unchanged even though the column was there. The text
    // assertion is what actually holds the column present on both viewports.
    await expectCurrentCoefficientShown(page, testInfo);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft-defensive.png", { fullPage: true });
  });

  test("sharing agreement detail page (draft, empty coefficient set)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_EMPTY, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft-empty.png", { fullPage: true });
  });

  test("sharing agreement detail page (published, mixed pending/applied)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      PUBLISHED_AGREEMENT_EDITED.id,
      PUBLISHED_AGREEMENT_EDITED,
      FIXED_COEFFICIENTS_MIXED,
      200,
    );

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT_EDITED.name);

    // A PUBLISHED agreement is editable now (the update endpoint no longer 409s
    // outside DRAFT) — prove the item is reachable, then close the menu so the
    // screenshot below stays in the same closed-menu state as its siblings.
    await page.getByRole("button", { name: "Más opciones del acuerdo" }).click();
    await expect(page.getByRole("menuitem", { name: "Editar datos del acuerdo" })).toBeVisible();
    await page.keyboard.press("Escape");

    // The last-edit record lives in the header's disclosure, so it has to be
    // opened for the screenshot to cover it at all.
    await page.getByRole("button", { name: /^Ver \d+ datos? más$/ }).click();
    await expect(page.getByText("Última edición")).toBeVisible();
    await stabilizePage(page);

    // FIXED_COEFFICIENTS_MIXED carries currentCoefficient on every row, as the
    // backend sends it whatever the status. The column is still absent: on a
    // published agreement the row's own value IS the one in force.
    await expect(page.getByText("Coeficiente actual")).toHaveCount(0);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-published.png", { fullPage: true });
  });

  test("sharing agreement detail page (superseded)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, SUPERSEDED_AGREEMENT.id, SUPERSEDED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 404);

    await navigateToSharingAgreementDetail(page, SUPERSEDED_AGREEMENT.name);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-superseded.png", { fullPage: true });
  });

  test("sharing agreement detail page (draft, no file)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      NO_FILE_DRAFT_AGREEMENT.id,
      NO_FILE_DRAFT_AGREEMENT,
      FIXED_COEFFICIENTS_EMPTY,
      404,
    );

    await navigateToSharingAgreementDetail(page, NO_FILE_DRAFT_AGREEMENT.name);

    await expect(page.getByText("No has importado ningún fichero en este acuerdo.")).toBeVisible();
    // The blocking reason is visible text, never a tooltip — critical on the
    // ~90% mobile user base, which has no hover. The control keeps `aria-disabled`
    // rather than `disabled`, so the reason stays reachable by keyboard.
    const generateButton = page.getByRole("button", { name: "Generar y descargar TXT" });
    await expect(generateButton).toHaveAttribute("aria-disabled", "true");
    // Focusable, not `disabled` — asserted by focusing it, because Playwright's
    // toBeDisabled() honours aria-disabled and so cannot tell "gated but still
    // reachable" from "removed from the tab order".
    await generateButton.focus();
    await expect(generateButton).toBeFocused();
    // One wording for the shortfall across the surface — "exactamente 100 %" is gone.
    await expect(page.getByText("Este acuerdo todavía no tiene coeficientes.")).toBeVisible();
    await expect(page.getByText(/exactamente 100/)).toHaveCount(0);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft-no-file.png", { fullPage: true });
  });

  test("sharing agreement detail page (mobile coefficient cards)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile-only card layout — not rendered on the desktop viewport.");

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    // Both the desktop table and the mobile card list render unconditionally (CSS-only
    // display toggle) — the table comes first in DOM order, so .last() is the mobile
    // card instance. Assert it's the one actually visible, not just relying on viewport.
    await expect(page.getByText("Vivienda A").last()).toBeVisible();

    await expect(page).toHaveScreenshot("sharing-agreement-detail-mobile.png", { fullPage: true });
  });

  test("sharing agreement detail page (batch activation bar, selection active)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    // FIXED_COEFFICIENTS_MIXED has exactly one PENDING row (Vivienda B) among
    // several APPLIED ones — selecting it is what mounts the batch bar at all.
    await page.getByRole("checkbox", { name: "Seleccionar Vivienda B" }).click();
    await expect(page.getByText("1 seleccionado")).toBeVisible();

    await expect(page.getByRole("button", { name: "Acciones", exact: true })).toBeEnabled();

    await stabilizePage(page);
    await expect(page).toHaveScreenshot("sharing-agreement-batch-bar-selection.png", { fullPage: true });
  });

  test("sharing agreement detail page (batch bar Acciones menu, single action fully available)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    await page.getByRole("checkbox", { name: "Seleccionar Vivienda B" }).click();
    await page.getByRole("button", { name: "Acciones", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Registrar fecha" })).toBeVisible();

    await stabilizePage(page);
    await expect(page).toHaveScreenshot("sharing-agreement-batch-bar-acciones-menu.png", { fullPage: true });
  });

  test("sharing agreement batch registration dialog (Registrar fecha, opened from Acciones)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    await page.getByRole("checkbox", { name: "Seleccionar Vivienda B" }).click();
    await page.getByRole("button", { name: "Acciones", exact: true }).click();
    await page.getByRole("menuitem", { name: "Registrar fecha" }).click();

    await expect(page.getByRole("heading", { name: "Registrar fecha de aplicación" })).toBeVisible();
    const confirmButton = page.getByRole("button", { name: "Registrar fecha" });
    await expect(confirmButton).toBeDisabled();
    await expect(page.getByText("Selecciona una fecha")).toBeVisible();

    await stabilizePage(page);
    await expect(page).toHaveScreenshot("sharing-agreement-batch-registration-dialog.png", { fullPage: true });
  });

  test("sharing agreement coefficient row actions menu (⋯ open)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    // Vivienda A (coef-1) is APPLIED/OPEN — "Corregir fecha" and "Desactivar"
    // only, no end-of-coverage action, the minimal (two-item) menu shape.
    await page.getByRole("button", { name: "Más acciones para Vivienda A" }).first().click();
    await expect(page.getByRole("menuitem", { name: "Corregir fecha" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Desactivar" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-row-actions-menu.png", { fullPage: true });
  });

  test("coefficient history drawer (draft)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_ALL_PENDING, 200);
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    // A DRAFT row had no kebab at all before this; now it carries exactly one
    // entry, and no lifecycle action.
    await page.getByRole("button", { name: "Más acciones para Vivienda A" }).first().click();
    await expect(page.getByRole("menuitem", { name: "Ver histórico" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Registrar fecha" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Ver histórico" }).click();

    // Assertions are scoped to the panel: several agreement names legitimately
    // appear both inside it and in the page behind it.
    const drawer = page.getByTestId("coefficient-history-drawer");
    await expect(drawer.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    // Scoped to the agreement's plant, so the supply's other plant is absent,
    // and the draft's own pending period never appears on a timeline.
    await expect(drawer.getByRole("heading", { name: "Planta Solar Norte" })).toBeVisible();
    await expect(drawer.getByRole("heading", { name: "Planta Solar Sur" })).toHaveCount(0);
    await expect(drawer.getByText("Reparto ampliación bloque B")).toHaveCount(0);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("coefficient-history-drawer-draft.png", { fullPage: true });
    // The screenshot tolerance can absorb a whole panel, so the periods are
    // asserted as text as well as pixels, on both viewports.
    await expect(drawer.getByText("25,0000 %")).toBeVisible();
    await expect(drawer.getByText("Desde 1 ene 2023")).toBeVisible();
    await expect(drawer.getByText("1 mar 2022 → 1 ene 2023")).toBeVisible();
  });

  test("coefficient history drawer (superseded)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, SUPERSEDED_AGREEMENT.id, SUPERSEDED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 404);
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY);

    await navigateToSharingAgreementDetail(page, SUPERSEDED_AGREEMENT.name);

    await page.getByRole("button", { name: "Más acciones para Vivienda A" }).first().click();
    await page.getByRole("menuitem", { name: "Ver histórico" }).click();

    const drawer = page.getByTestId("coefficient-history-drawer");
    await expect(drawer.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("coefficient-history-drawer-superseded.png", { fullPage: true });
    // The oldest period belongs to the agreement being viewed, so it is marked
    // and deliberately not linked back to the page the admin is already on.
    await expect(drawer.getByText("Este acuerdo")).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Reparto original 2022" })).toHaveCount(0);
    // The later period, on another agreement, keeps its link.
    await expect(drawer.getByRole("link", { name: "Reparto vecinos bloque A" })).toBeVisible();
    await expect(drawer.getByText("En vigor")).toBeVisible();
  });

  test("sharing agreement coefficient recalculation dialog (Corregir fecha)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);
    await page.getByRole("button", { name: "Más acciones para Vivienda A" }).first().click();
    await page.getByRole("menuitem", { name: "Corregir fecha" }).click();

    await expect(page.getByRole("heading", { name: "Corregir fecha de aplicación" })).toBeVisible();
    await expect(page.getByText(/producción ya atribuida a este suministro/)).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-coefficient-recalculation-dialog.png", { fullPage: true });
  });

  test("sharing agreement coefficient close dialog (Cerrar (baja))", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);
    // Local C (coef-3) is the OPEN_ORPHAN row — the only one offering "Cerrar (baja)".
    await page.getByRole("button", { name: "Más acciones para Local C" }).first().click();
    await page.getByRole("menuitem", { name: "Cerrar (baja)" }).click();

    await expect(page.getByRole("heading", { name: "Cerrar coeficiente" })).toBeVisible();
    await expect(page.getByText(/dejará de recibir atribución de producción/)).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-coefficient-close-dialog.png", { fullPage: true });
  });

  test("sharing agreement detail page (mobile batch bar doesn't cover the last card)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Fixed bottom bar is mobile-only — desktop's bar is static in-flow.");

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    await page.getByRole("checkbox", { name: "Seleccionar Vivienda B" }).click();
    await expect(page.getByRole("button", { name: "Acciones", exact: true })).toBeVisible();

    await page.addStyleTag({
      content: `*, *::before, *::after { animation: none !important; transition: none !important; }`,
    });
    await page.waitForFunction(() => document.fonts.ready);

    // Scroll the real page (not a fullPage stitch, which wouldn't exercise a
    // fixed element's actual on-screen overlap) to the very bottom, so the
    // last card and the fixed bar are both on screen at once — this is the
    // assertion the screenshot exists to make: the reserved spacer must
    // leave the last card's bottom edge visible above the bar, not under it.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // "Ático F" is the last row in FIXED_COEFFICIENTS_MIXED.
    const lastCard = page.getByText("Ático F").last();
    await expect(lastCard).toBeVisible();
    const cardBox = await lastCard.boundingBox();
    const barBox = await page.getByRole("button", { name: "Acciones", exact: true }).boundingBox();
    expect(cardBox).not.toBeNull();
    expect(barBox).not.toBeNull();
    // The last card's bottom edge must sit above (a smaller y than) the top
    // of the fixed bar — i.e. not underneath it.
    expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(barBox!.y);

    await expect(page).toHaveScreenshot("sharing-agreement-batch-bar-mobile-last-card.png");
  });

  test("sharing agreement edit dialog (seeded with existing values)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.locator('button:has([data-testid="MoreVertIcon"])').click();
    await page.getByRole("menuitem", { name: "Editar datos del acuerdo" }).click();

    await expect(page.getByLabel("Nombre", { exact: false })).toHaveValue(DRAFT_AGREEMENT.name);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-edit-dialog.png", { fullPage: true });
  });

  test("sharing agreement delete confirmation", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.locator('button:has([data-testid="MoreVertIcon"])').click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();

    await expect(page.getByRole("heading", { name: "Eliminar acuerdo de reparto" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-delete-confirmation.png", { fullPage: true });
  });

  test("sharing agreement detail page (draft, incomplete sum — publish not offered)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      DRAFT_AGREEMENT.id,
      DRAFT_AGREEMENT,
      FIXED_COEFFICIENTS_INCOMPLETE,
      200,
    );

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    // Publishing a set that does not sum to exactly 1 is refused by the backend
    // with a 409, so the control is not rendered at all — an action that is going
    // to fail is never offered. What is missing is stated as visible text instead.
    await expect(page.getByRole("button", { name: "Poner en vigor" })).toHaveCount(0);
    // Exact: the imported-file block offers "Descargar fichero importado", which
    // a substring match would pick up.
    await expect(page.getByRole("button", { name: "Descargar fichero", exact: true })).toHaveCount(0);

    await expect(
      page.getByText("«Poner en vigor» y «Generar el fichero» aparecerán cuando los coeficientes sumen 100,0000 %."),
    ).toBeVisible();
    await expect(page.getByText(/Completa el reparto: Faltan .* para llegar al 100,0000/)).toBeVisible();

    // Authoring is what this step actually offers, promoted on the banner. The
    // split section yields its own pair while the banner is carrying them, so
    // there is exactly one "Editar a mano" on screen.
    await expect(page.getByRole("button", { name: "Editar a mano" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Importar TXT" })).toHaveCount(1);

    // The gated-control pattern itself has not gone away — it moved to the file
    // panel's generate action, which is blocked by the same incomplete sum.
    const generateButton = page.getByRole("button", { name: "Generar y descargar TXT" });
    await expect(generateButton).toHaveAttribute("aria-disabled", "true");
    // Focusable, not `disabled`. Asserted by actually focusing it: Playwright's
    // toBeEnabled() honours aria-disabled, so it cannot distinguish "gated but
    // still reachable" from "removed from the tab order" — which is the whole
    // point of gating this way.
    await generateButton.focus();
    await expect(generateButton).toBeFocused();

    // The reason is visible text under the control the instant the page renders —
    // never a tooltip, and never requiring a hover or a menu to be opened first.
    const reasonId = await generateButton.getAttribute("aria-describedby");
    expect(reasonId, "a gated control must name the element describing it").toBeTruthy();
    // Selected by attribute, not by `#id`: React's useId emits values like
    // "«rh»", which are not valid CSS identifiers, and `CSS.escape` is not
    // available in the Node-side test context.
    const reason = page.locator(`[id="${reasonId}"]`);
    await expect(reason).toBeVisible();
    await expect(reason).toHaveText(/Faltan .* para llegar al 100,0000/);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-draft-incomplete-sum.png", { fullPage: true });
  });

  test("sharing agreement publish confirmation", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      DRAFT_AGREEMENT.id,
      DRAFT_AGREEMENT,
      FIXED_COEFFICIENTS_ALL_PENDING,
      200,
    );

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Poner en vigor" }).click();

    await expect(page.getByRole("heading", { name: "Poner en vigor" })).toBeVisible();
    await expect(page.getByText(/Poner en vigor no aplica nada por sí mismo/)).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-publish-confirmation.png", { fullPage: true });
  });

  test("sharing agreement revert-to-draft confirmation", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      PUBLISHED_AGREEMENT.id,
      PUBLISHED_AGREEMENT,
      FIXED_COEFFICIENTS_ALL_PENDING,
      200,
    );

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);
    // Reverting is a labelled control on the lifecycle rail now. The published
    // agreement's kebab is gone entirely: editing and deleting are draft-only.
    await page.getByRole("button", { name: "Volver a borrador" }).click();

    await expect(page.getByRole("heading", { name: "Volver a borrador" })).toBeVisible();
    await expect(
      page.getByText(/dejará de estar en vigor y sus coeficientes volverán a ser editables/),
    ).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-revert-confirmation.png", { fullPage: true });
  });

  test("sharing agreement upload dialog (idle)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Importar TXT" }).click();

    await expect(page.getByText(`${FIXED_PLANT.regulatoryCode}_AAAA.txt`)).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-upload-dialog-idle.png", { fullPage: true });
  });

  test("sharing agreement upload dialog (rejected lines)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);
    await mockSharingAgreementFileUploadRejection(page, FIXED_PLANT_ID, DRAFT_AGREEMENT.id);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Importar TXT" }).click();

    await page.setInputFiles('input[type="file"]', {
      name: `${FIXED_PLANT.regulatoryCode}_2026.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from("ES0031300000000001AA;0,500000\n"),
    });
    await page.getByRole("button", { name: "Subir fichero" }).last().click();

    await expect(page.getByText("Errores del fichero")).toBeVisible();
    await expect(page.getByText("Errores por línea")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-upload-dialog-rejected.png", { fullPage: true });
  });

  test("sharing agreement generate dialog (year pre-filled)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      NO_FILE_DRAFT_AGREEMENT.id,
      NO_FILE_DRAFT_AGREEMENT,
      FIXED_COEFFICIENTS_ALL_PENDING,
      404,
    );
    await mockSharingAgreementGenerateFile(page, FIXED_PLANT_ID, NO_FILE_DRAFT_AGREEMENT.id);

    await navigateToSharingAgreementDetail(page, NO_FILE_DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Generar y descargar TXT" }).click();

    await expect(page.getByRole("heading", { name: "Generar fichero" })).toBeVisible();
    await expect(page.getByLabel("Año")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-generate-dialog.png", { fullPage: true });
  });

  test("sharing agreement coefficient editor (empty draft, add-supply picker open)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_EMPTY, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();
    await page.getByRole("button", { name: "Añadir suministro" }).click();

    await expect(page.getByText(FIXED_SUPPLY.name)).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-editor-add-supply-picker.png", { fullPage: true });
  });

  test("sharing agreement coefficient editor (mid-edit, sum below 100%)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Removing a row targets the desktop table instance specifically — both the table and card render in the DOM regardless of viewport (CSS-only toggle), so exercising this on mobile would need a second, separately-scoped interaction just to avoid strict-mode ambiguity, for no additional coverage.",
    );

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();

    // FIXED_COEFFICIENTS_MIXED sums to exactly 100%; removing Vivienda A's
    // 30% coefficient brings the live sum to 70%, below the full-sum copy.
    await page.getByRole("button", { name: /Quitar Vivienda A/ }).first().click();

    // Plain string, not regex: the percent formatter's U+00A0 before "%" is
    // normalized against a regular space by getByText's string matcher, but
    // not by its regex matcher.
    await expect(page.getByText("Suma del fichero: 70,0000 %")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-editor-mid-edit.png", { fullPage: true });
  });

  test("sharing agreement coefficient editor (row empty-value error)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Targets the desktop table's input specifically to avoid strict-mode ambiguity with the always-present, CSS-hidden mobile card instance.",
    );

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();

    // Editor opens in kW mode by default.
    await page.getByPlaceholder("0,00").first().fill("");

    await expect(page.getByText("Obligatorio").first()).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-editor-empty-value-error.png", { fullPage: true });
  });

  test("sharing agreement coefficient editor (toggled to kW, values converted and kept)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Same duplicate-DOM-instance rationale as the other interactive editor specs above.",
    );

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();
    await expect(page.getByRole("button", { name: "kW" })).toHaveAttribute("aria-pressed", "true");

    // The editor works in percent now, so the round trip under test is kW -> %
    // -> kW. Vivienda A's 0.3 coefficient is 13,50 kW of the 45 kW installed.
    await page.getByRole("button", { name: "%" }).click();
    await expect(page.locator("tr", { hasText: "Vivienda A" }).getByRole("textbox")).toHaveValue("30,0000");

    await page.getByRole("button", { name: "kW" }).click();
    // Converted, not cleared, and not rounding-drifted: toggling only ever
    // re-derives the text from the canonical value, never the other way round.
    await expect(page.locator("tr", { hasText: "Vivienda A" }).getByRole("textbox")).toHaveValue("13,50");

    await page.getByRole("button", { name: "%" }).click();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-editor-toggled-to-kw.png", { fullPage: true });
  });

  test("sharing agreement coefficient editor (current coefficient while editing in kW)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Same duplicate-DOM-instance rationale as the other interactive editor specs above.",
    );

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();
    // The editor opens in kW; the sibling "toggled to kW" spec ends in percent,
    // so this is the only baseline that shows the column with a kW input beside
    // it. The difference is a percentage either way — it is computed from the
    // canonical 0-1 coefficient, which the kW text is only a view of.
    await expect(page.getByRole("button", { name: "kW" })).toHaveAttribute("aria-pressed", "true");

    const vivendaA = page.locator("tr", { hasText: "Vivienda A" });
    await expect(vivendaA.getByRole("textbox")).toHaveValue("13,50");
    // 13,50 kW of 45 kW installed is 0.3, against a current 0.25.
    await expect(vivendaA).toContainText("+5,0000");

    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-editor-kw-current-coefficient.png", {
      fullPage: true,
    });
  });

  test("sharing agreement coefficient editor (kW rounds to installed but coefficient sum isn't exact)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Same duplicate-DOM-instance rationale as the other interactive editor specs above.",
    );

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    // Three rows of 0.333333 sum to 999,999 units (short by one) but each
    // row's kW, rounded to 2dp on a 45 kW plant, still totals to 45,00 kW.
    const roundingCaveatAgreement = { ...DRAFT_AGREEMENT, installedPowerKw: 45 };
    const roundingCaveatCoefficients = [
      { coefficientId: "1", supply: { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AA" }, coefficient: 0.333333 },
      { coefficientId: "2", supply: { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" }, coefficient: 0.333333 },
      { coefficientId: "3", supply: { id: "supply-3", name: "Local C", code: "ES0031300000000003CC" }, coefficient: 0.333333 },
    ];
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, roundingCaveatAgreement, roundingCaveatCoefficients, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();

    await expect(page.getByText("Suma del fichero: 99,9999 %")).toBeVisible();
    // Plain strings, not regex — same NBSP-normalization rationale as the
    // percentage assertion above: getByText's string matcher normalizes the
    // formatter's U+00A0 against a regular space; its regex matcher does not.
    await expect(page.getByText("(con redondeo a céntimos)", { exact: false })).toBeVisible();
    await expect(page.getByText("faltan 0,0001 % por ajustar en modo porcentaje.", { exact: false })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-editor-kw-rounding-caveat.png", { fullPage: true });
  });

  // -------------------------------------------------------------------------
  // Plant detail header
  // -------------------------------------------------------------------------

  async function openPlantDetail(page: Page) {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockPlantDetailRoutes(page);

    await page.goto(`/production/${FIXED_PLANT_ID}`);
    await expect(page.getByRole("heading", { level: 1, name: FIXED_PLANT.name })).toBeVisible();
    await stabilizePage(page);
  }

  test("plant detail page", async ({ page }) => {
    await openPlantDetail(page);

    await expect(page).toHaveScreenshot("plant-detail.png", { fullPage: true });
  });

  test("plant detail page (details expanded)", async ({ page }) => {
    await openPlantDetail(page);

    await page.getByRole("button", { name: /^Ver \d+ datos? más$/ }).click();
    await expect(page.getByText("HUAWEI")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("plant-detail-expanded.png", { fullPage: true });
  });

  /**
   * AC1. The redesign exists because the old header pushed the page's content
   * off a phone's first viewport, so the budget is the acceptance criterion
   * itself rather than a stylistic preference — measured, not eyeballed.
   */
  test("AC1: the collapsed headers fit a 390px viewport", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The 120px budget is specified against a 390px viewport.");

    await openPlantDetail(page);

    const plantHeader = await page.getByTestId("detail-header").boundingBox();
    testInfo.annotations.push({ type: "plant header height", description: `${plantHeader?.height}px` });
    console.log(`AC1 plant header height: ${plantHeader?.height}px`);
    expect(plantHeader?.height).toBeLessThanOrEqual(120);
  });

  /**
   * The agreement header is measured too, but against a regression guard rather
   * than AC1's figure. AC1 states its 120px budget for a PLANT, and this header
   * carries two things a plant's does not: a status badge and a link to the
   * plant it belongs to. At 390px the fixture's name ("Reparto vecinos bloque
   * A") also takes two lines on its own. The bound below exists to catch the
   * header growing further, and is deliberately not dressed up as the AC.
   */
  test("the collapsed agreement header stays within its measured budget at 390px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The budget is measured against a 390px viewport.");

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    const agreementHeader = await page.getByTestId("detail-header").boundingBox();
    testInfo.annotations.push({ type: "agreement header height", description: `${agreementHeader?.height}px` });
    console.log(`Agreement header height: ${agreementHeader?.height}px`);
    expect(agreementHeader?.height).toBeLessThanOrEqual(150);
  });

  // -------------------------------------------------------------------------
  // List headers
  // -------------------------------------------------------------------------

  /**
   * Every list page the suite can actually reach with its existing fixtures.
   *
   * Three of the eight are absent, for two different reasons:
   *
   *   - Partners and partner supply points, because App.tsx routes neither.
   *     There is no `path="partners"`, and nothing in the app links to one.
   *     They were migrated all the same (the issue lists them), but no browser
   *     test can open a page the router does not serve.
   *
   *   - /members, for the reason the file header already gives for its guard:
   *     it redirects on a cold goto before community selection resolves. It
   *     also has no memberships fixture — the broad communities mock would
   *     answer that call with a list of communities. Its header is the same
   *     three-counter shape as /users, which IS measured below, and the page
   *     itself stays covered by MembersPage.spec.tsx.
   */
  const LIST_PAGES: { name: string; open: (page: Page) => Promise<void> }[] = [
    {
      name: "/production",
      open: async (page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
        await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
        await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
        await page.goto("/production");
        await stabilizePage(page);
      },
    },
    {
      name: "/supply-points",
      open: async (page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
        await mockAllApiRoutes(page, FIXED_MEMBER_USER);
        await page.goto("/supply-points");
        await stabilizePage(page);
      },
    },
    {
      name: "/users",
      open: async (page) => {
        await injectAuthToken(page);
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await page.goto("/users");
        await stabilizePage(page);
      },
    },
    {
      name: "/communities",
      open: async (page) => {
        await injectAuthToken(page);
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await page.goto("/communities");
        await stabilizePage(page);
      },
    },
    {
      name: "sharing agreements list",
      open: async (page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
        await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
        await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
        await navigateToSharingAgreements(page);
      },
    },
  ];

  /**
   * AC1 and AC2, measured rather than eyeballed.
   *
   * Two separate promises, and a counter strip can keep one while breaking the
   * other. "One row" alone is satisfied by three cells that each clip their
   * label to "Inac…", which is the layout doing the reader no favours; so the
   * labels are checked for actual clipping too, by asking each one whether it
   * overflows its own box.
   *
   * Heights are recorded for every page, not just the one AC2 bounds, so the
   * next person changing this header can see what it costs everywhere.
   */
  for (const listPage of LIST_PAGES) {
    test(`AC1: the ${listPage.name} header keeps its counters on one unclipped row at 390px`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "AC1 is specified against a 390px viewport.");

      await listPage.open(page);

      const header = page.getByTestId("list-header");
      await expect(header).toBeVisible();

      const box = await header.boundingBox();
      testInfo.annotations.push({
        type: "list header height",
        description: `${listPage.name}: ${box?.height}px`,
      });
      console.log(`List header height — ${listPage.name}: ${box?.height}px`);

      // The strip's captions are exactly the counter labels: the title is an
      // h1 and the subtitle is body2, so nothing else in the header is one.
      const labels = header.locator(".MuiTypography-caption");
      const labelCount = await labels.count();
      expect(labelCount).toBeGreaterThanOrEqual(2);

      const tops = await labels.evaluateAll((nodes) =>
        nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
      );
      expect(new Set(tops).size, `counters on ${listPage.name} span ${new Set(tops).size} rows`).toBe(1);

      const clipped = await labels.evaluateAll((nodes) =>
        nodes.filter((node) => node.scrollWidth > node.clientWidth).map((node) => node.textContent),
      );
      expect(clipped, `clipped counter labels on ${listPage.name}`).toEqual([]);
    });
  }

  /**
   * AC2. The plants list is the page the budget is stated against: two
   * counters, the shortest header of the eight, and the one whose old version
   * spent three rows on a single column of stats.
   */
  test("AC2: the /production list header is at most 140px at 390px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The 140px budget is specified against a 390px viewport.");

    await LIST_PAGES[0].open(page);

    const box = await page.getByTestId("list-header").boundingBox();
    testInfo.annotations.push({ type: "production list header height", description: `${box?.height}px` });
    console.log(`AC2 /production list header height: ${box?.height}px`);
    expect(box?.height).toBeLessThanOrEqual(140);
  });

  // Note: "import partners modal" is intentionally omitted. See file header.
});
