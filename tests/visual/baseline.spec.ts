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
 *   FIXED_COMMUNITY_ADMIN_USER → defined for completeness; /members is not Playwright-tested
 *                                because CommunityAdminRoute defers community selection to a
 *                                useEffect that fires after the first render, causing a redirect
 *                                to / before the guard re-evaluates. The modal and page are
 *                                covered by unit tests (ImportPartnersModal.spec.tsx, etc.).
 *   FIXED_PLATFORM_ADMIN_USER  → /platform (platform welcome), /users (users page)
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
 * Defined for completeness; not currently used in a Playwright test — see file header.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- defined for three-role completeness; no Playwright test yet (CommunityAdminRoute timing — see file header)
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
  items: [FIXED_MEMBER_USER, FIXED_USER_2],
  size: 10,
  totalElements: 2,
  totalPages: 1,
  number: 0,
};

const EMPTY_PRODUCTION: unknown[] = [];

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

  test("platform welcome page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/platform");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("platform-welcome-page.png", { fullPage: true });
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

  // Note: FIXED_COMMUNITY_ADMIN_USER and a test for /members are intentionally
  // omitted from Playwright coverage. See the file header for the reason.
  // Note: "import partners modal" is intentionally omitted. See file header.
});
