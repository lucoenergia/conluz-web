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

import { test, expect, type Page, type Route } from "@playwright/test";

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

const PAGED_PLANTS = {
  items: [FIXED_PLANT],
  size: 10000,
  totalElements: 1,
  totalPages: 1,
  number: 0,
};

/** Three agreements, one per status, so the populated baseline exercises every chip/badge colour. */
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
  },
];

/**
 * Coefficient set covering every case the detail-page baselines must exercise:
 *   - PENDING with no validFrom (row 2) and APPLIED with validFrom (rows 1,3,4,5,6)
 *   - all 5 endState values: OPEN (1,2), OPEN_ORPHAN (3), PENDING_SUCCESSION (4), DERIVED (5), CLOSED (6)
 *   - a coefficient: 0 row (row 6) — meaningful (a supply that left distribution), never hidden
 *   - fileSum = 1.00 (100%); appliedSum = 0.75 (75%, below 100% — exercises the informational card)
 */
const FIXED_COEFFICIENTS_MIXED = [
  {
    coefficientId: "coef-1",
    supply: { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AA" },
    coefficient: 0.3,
    applicationState: "APPLIED",
    validFrom: "2024-01-01T00:00:00Z",
    endState: "OPEN",
  },
  {
    coefficientId: "coef-2",
    supply: { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" },
    coefficient: 0.25,
    applicationState: "PENDING",
    endState: "OPEN",
  },
  {
    coefficientId: "coef-3",
    supply: { id: "supply-3", name: "Local C", code: "ES0031300000000003CC" },
    coefficient: 0.2,
    applicationState: "APPLIED",
    validFrom: "2024-02-01T00:00:00Z",
    endState: "OPEN_ORPHAN",
  },
  {
    coefficientId: "coef-4",
    supply: { id: "supply-4", name: "Nave D", code: "ES0031300000000004DD" },
    coefficient: 0.15,
    applicationState: "APPLIED",
    validFrom: "2023-01-01T00:00:00Z",
    endState: "PENDING_SUCCESSION",
  },
  {
    coefficientId: "coef-5",
    supply: { id: "supply-5", name: "Trastero E", code: "ES0031300000000005EE" },
    coefficient: 0.1,
    applicationState: "APPLIED",
    validFrom: "2022-01-01T00:00:00Z",
    endState: "DERIVED",
    endDate: "2023-12-31T00:00:00Z",
  },
  {
    coefficientId: "coef-6",
    supply: { id: "supply-6", name: "Ático F", code: "ES0031300000000006FF" },
    coefficient: 0,
    applicationState: "APPLIED",
    validFrom: "2024-03-01T00:00:00Z",
    endState: "CLOSED",
    endDate: "2024-05-01T00:00:00Z",
  },
];

const FIXED_COEFFICIENTS_EMPTY: unknown[] = [];

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
// Helper: override the single-agreement, partition-coefficients and file
// routes for one agreement. Registered AFTER mockSharingAgreementsPlantRoutes()
// so its more specific predicates win (Playwright matches routes in reverse
// registration order) — the broad `/plants/{id}/sharing-agreements` route
// registered there would otherwise return the plain list for these URLs too.
// ---------------------------------------------------------------------------

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

  // Community-admin fixture tests: sharing-agreement detail page.
  // Same CommunityAdminRoute cold-navigation limitation as the list page (see
  // file header) — reached by navigating through the list and clicking a
  // card's own "Ver detalle" menu item, never via a cold page.goto().
  //
  // The file panel never probes the file endpoint on page load (by design —
  // the download is click-triggered, see SharingAgreementFilePanel), so its
  // initial render always shows the "Descargar fichero" button regardless of
  // the mocked file status. These baselines therefore all capture the same
  // file-panel state; the 404 empty-state copy is exercised by unit tests
  // (SharingAgreementFilePanel.spec.tsx), not by a visual baseline.

  async function navigateToSharingAgreementDetail(page: Page, agreementName: string) {
    await navigateToSharingAgreements(page);

    const agreementCard = page.locator(".MuiCard-root").filter({ hasText: agreementName });
    await agreementCard.getByRole("button").click();
    await page.getByRole("menuitem", { name: /Ver detalle/i }).click();

    await expect(page.getByText("Suma del fichero")).toBeVisible();
    await stabilizePage(page);
  }

  const DRAFT_AGREEMENT = FIXED_SHARING_AGREEMENTS[1];
  const PUBLISHED_AGREEMENT = FIXED_SHARING_AGREEMENTS[0];
  const SUPERSEDED_AGREEMENT = FIXED_SHARING_AGREEMENTS[2];

  test("sharing agreement detail page (draft, with coefficients)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 404);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft.png", { fullPage: true });
  });

  test("sharing agreement detail page (draft, empty coefficient set)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_EMPTY, 404);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft-empty.png", { fullPage: true });
  });

  test("sharing agreement detail page (published, mixed pending/applied)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

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

  test("sharing agreement detail page (mobile coefficient cards)", async ({ page }) => {
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

  // Note: "import partners modal" is intentionally omitted. See file header.
});
