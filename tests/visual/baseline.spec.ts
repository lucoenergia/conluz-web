/**
 * Visual regression baseline tests — Phase 0.5 safety net
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
 */

import { test, expect, type Page, type Route } from "@playwright/test";

// ---------------------------------------------------------------------------
// Fixed fixtures — these values NEVER change between runs
// ---------------------------------------------------------------------------

const FIXED_TOKEN = "test-jwt-token-for-visual-regression";

const FIXED_SUPPLY_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const FIXED_USER = {
  id: "11111111-2222-3333-4444-555555555555",
  personalId: "12345678A",
  number: 1,
  fullName: "María García López",
  address: "Calle Mayor, 1",
  email: "admin@conluz.test",
  phoneNumber: "600000001",
  enabled: true,
  role: "ADMIN",
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
  user: FIXED_USER,
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
  user: FIXED_USER,
};

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
};

const PAGED_SUPPLIES = {
  items: [FIXED_SUPPLY, FIXED_SUPPLY_2],
  size: 10000,
  totalElements: 2,
  totalPages: 1,
  number: 0,
};

const PAGED_USERS = {
  items: [
    { ...FIXED_USER, role: "ADMIN" },
    { ...FIXED_USER_2, role: "PARTNER" },
  ],
  size: 10,
  totalElements: 2,
  totalPages: 1,
  number: 0,
};

const EMPTY_PRODUCTION = [];
const EMPTY_CONSUMPTION: object[] = [];

// ---------------------------------------------------------------------------
// Helper: set up all API route mocks on a given page
// ---------------------------------------------------------------------------

async function mockAllApiRoutes(page: Page) {
  // Current user (needed by AuthenticatedLayout on every protected page)
  await page.route("**/api/v1/users/current", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FIXED_USER),
    })
  );

  // Supply list
  await page.route("**/api/v1/supplies**", async (route: Route) => {
    const url = route.request().url();
    // Supply detail: /api/v1/supplies/{id}/...  or  /api/v1/supplies/{id}
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
    // Supplies list
    if (route.request().method() === "GET" && !url.includes("/import") && !url.includes("/datadis") && !url.includes("/partitions")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PAGED_SUPPLIES),
      });
    }
    return route.continue();
  });

  // User list (Partners page)
  await page.route("**/api/v1/users**", async (route: Route) => {
    const url = route.request().url();
    // /users/{id}/supplies
    if (url.includes("/supplies")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([FIXED_SUPPLY]),
      });
    }
    // /users/{id} specific user
    if (url.match(/\/api\/v1\/users\/[a-z0-9-]+$/)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXED_USER),
      });
    }
    // users list
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PAGED_USERS),
      });
    }
    return route.continue();
  });

  // Plants, production, sharing-agreements — return empty/null to avoid loading spinners
  await page.route("**/api/v1/plants**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], size: 10, totalElements: 0, totalPages: 0, number: 0 }),
    })
  );

  await page.route("**/api/v1/sharing-agreements**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  );

  await page.route("**/api/v1/info**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: "1.0.0-test" }),
    })
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

  test("home page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page);

    await page.goto("/");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("home-page.png", { fullPage: true });
  });

  test("supplies list page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page);

    await page.goto("/supply-points");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supplies-list.png", { fullPage: true });
  });

  test("supply detail page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail.png", { fullPage: true });
  });

  test("partners page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page);

    await page.goto("/partners");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("partners-page.png", { fullPage: true });
  });

  test("import supplies modal open", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page);

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

  // ── Task 0 baselines: captured on PRE-REFACTOR code ────────────────────────
  // These three screenshots must be committed BEFORE AppModal is built so the
  // "before" state is recorded and the post-migration diff is meaningful.

  test("disable confirmation modal open", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page);

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
    await mockAllApiRoutes(page);

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
    await page
      .getByRole("button", { name: /^Deshabilitar$/i })
      .click();

    await page.waitForSelector("text=ha sido deshabilitado");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("disable-success-modal.png", {
      fullPage: true,
    });
  });

  test("import partners modal open", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page);

    await page.goto("/partners");
    await stabilizePage(page);

    // Click "Importar CSV" on the Partners page
    const importBtn = page.getByRole("button", { name: /importar csv/i });
    await importBtn.scrollIntoViewIfNeeded();
    await importBtn.click();

    await page.waitForSelector("text=Importar Socios desde CSV");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("import-partners-modal.png", {
      fullPage: true,
    });
  });
});
